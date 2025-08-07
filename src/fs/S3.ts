import { join, basename, dirname, resolve } from 'node:path'
import { createReadStream, createWriteStream } from 'node:fs';
import { split } from '../utils/path'
import { Path } from '../types'
import { FileSystem, FileItem, FileAttributes, FileAttributeType } from '../FileSystem'
import { S3Client, 
    ListBucketsCommand, ListObjectsCommand, GetObjectCommand, PutObjectCommand,
    CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand,
    DeleteObjectCommand, CopyObjectCommand, CreateBucketCommand,  DeleteBucketCommand
} from "@aws-sdk/client-s3";
import { NodeJsRuntimeStreamingBlobPayloadOutputTypes } from "@smithy/types"

// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/


export const ATTRIBUTES: FileAttributes = [
    {
        name: "name",     
        type: FileAttributeType.String, 
        title: "Name"
    },
    {
        name: "size",     
        type: FileAttributeType.Number, 
        title: "Size"
    },
    {
        name: "modified", 
        type: FileAttributeType.Date, 
        title: "Last Modified"
    }
]



export default class S3 extends FileSystem {
    constructor(
        private host = 'https://s3.amazonaws.com', // the global endpoint (auto-detects the bucket's region)
        private accessKeyId: string, 
        private secretAccessKey: string, 
        private region = 'us-east-1',   // the default region, particularly for legacy or unspecified requests
        private port = 443,
        private onError = (e: Error) => {},
        private onClose = () => {}
    ) { 
        super()
    }

    async open(): Promise<true> {
        try {
            this.connection = new S3Client({
                endpoint: `${this.host}:${this.port}`,
                region: this.region,
                forcePathStyle: true,   // Needed for MinIO and some other non-AWS services
                credentials: {
                    accessKeyId: this.accessKeyId,
                    secretAccessKey: this.secretAccessKey
                }
            })
        } catch (e) {
            this.onError(e)
        }
        return Promise.resolve(true)
    }

    close() {
        this.connection && this.onClose()
        this.connection?.destroy()
        this.connection = null
    }

    opened() { 
        return this.connection != null
    }

    async pwd(): Promise<Path> {
        return Promise.resolve('/')
    }
   
    async ls(dir: Path): Promise<FileItem[]> {
        const parts = split(dir)
        if (!parts.length) {
            return this.listBuckets()
        }

        const target = parts.length > 1 ? parts.slice(1).join('/') + '/' : undefined

        const output = await this.connection.send( new ListObjectsCommand({
            Bucket: parts[0],
            MaxKeys: 1000,
            Delimiter: '/',
            Prefix: target
        }) )

        return [
            ...(output.CommonPrefixes ?? []).map(prefix => ({
                path: resolve('/', parts[0], prefix.Prefix),
                name: basename(prefix.Prefix),
                dir: true,
                size: 0,
                modified: new Date()
            })),
            ...(output.Contents ?? [])
                .filter(({Key}) => Key != target)
                .map(item => ({
                    path: resolve('/', parts[0], item.Key),
                    name: basename(item.Key),
                    dir: false,
                    size: item.Size,
                    modified: new Date(item.LastModified)
                }))
        ]
    }

    async get(fromRemote: Path, toLocal: Path): Promise<void> {
        const parts = split(fromRemote)

        const output = await this.connection.send( new GetObjectCommand({
            Bucket: parts[0],
            Key: parts.slice(1).join('/')
        }) )

        if (output.Body) {
            const body = output.Body as NodeJsRuntimeStreamingBlobPayloadOutputTypes
            const writeStream = createWriteStream(toLocal)
            body.pipe(writeStream)

            return new Promise<void>((resolve, reject) => {
                writeStream.on('finish', resolve)
                writeStream.on('error', reject)
            })
        }
        return Promise.resolve()
    }

    async put(fromLocal: Path, toRemote: Path): Promise<void> {
        const parts = split(toRemote)

        const { UploadId } = await this.connection.send(
            new CreateMultipartUploadCommand({
                Bucket: parts[0],
                Key: parts.slice(1).join('/')
            })
        )

        const partSize = 5 * 1024 * 1024

        const fromStream = createReadStream(fromLocal, { highWaterMark: partSize });
        let buffer: any[] = [];
        let partNumber = 1
        const uploadParts: { ETag: string|undefined, PartNumber: number }[] = []

        const uploadPart = async () => {
            const { ETag } = await this.connection.send( new UploadPartCommand({
                Bucket: parts[0],
                Key: parts.slice(1).join('/'),
                PartNumber: partNumber,
                UploadId,
                Body: Buffer.concat(buffer)
            }) )
            uploadParts.push({ ETag, PartNumber: partNumber });           
            partNumber++;
            buffer = [];
        }

        for await (const chunk of fromStream) {
            buffer.push(chunk);
            if (buffer.length >= partSize) {
                await uploadPart()
            }
        }
        if (buffer.length) {
            await uploadPart()
        }

        await this.connection.send(
            new CompleteMultipartUploadCommand({
                Bucket: parts[0],
                Key: parts.slice(1).join('/'),
                UploadId,
                MultipartUpload: { Parts: uploadParts }
            })
        )
    }

    async rm(path: Path, recursive: boolean): Promise<void> {   // dir must be empty      
        const parts = split(path)
        await this.connection.send(new DeleteObjectCommand({
            Bucket: parts[0],
            Key: parts.slice(1).join('/') + (recursive ? '/' : '')
        }));
    }

    async mkdir(path: Path): Promise<void> {
        const parts = split(path)
        try {
            await this.connection.send( new PutObjectCommand({
                Bucket: parts[0],
                Key: parts.slice(1).join('/') + '/',
                Body: '' as string
            }) )
        } catch (e) {
            this.onError(e)
        }
    }

    async rename(from: Path, to: Path): Promise<void> {
        return this.mv(from, to)
    }

    async mv(from: Path, to: Path): Promise<void> {
        const isDir = (await this.ls(dirname(from))).find(({path}) => path == from)?.dir ?? false
        await this.cp(from, to, isDir)

        const recursiveRm = async (path: string) => {
            await Promise.all(
                (await this.ls(path)).map(f => f.dir ? recursiveRm(f.path) : this.rm(f.path, false))
            )
            await this.rm(path, true)
        }
        await (isDir ? recursiveRm(from) : this.rm(from, isDir))
    }

    async cp(from: Path, to: Path, recursive: boolean): Promise<void> {
        if (recursive) {
            await Promise.all(
                (await this.ls(from)).map(f =>
                    this.cp(f.path, resolve(to, f.name), f.dir)
                )
            )
        } else {
            const parts = split(from)
            await this.connection.send( new CopyObjectCommand({
                Bucket: parts[0],
                CopySource: resolve(from) + (recursive ? '/' : ''),
                Key: split(to).slice(1).join('/') + (recursive ? '/' : '')
            }) )
        }
    }

    async write(path: Path, s: string): Promise<void> {
        const parts = split(path)
        try {
            await this.connection.send( new PutObjectCommand({
                Bucket: parts[0],
                Key: parts.slice(1).join('/'),
                Body: s
            }) )
        } catch (e) {
            this.onError(e)
        }
    }


    private async listBuckets(): Promise<FileItem[]> {
        const output = await this.connection.send( new ListBucketsCommand({}) )
        return (output.Buckets ?? []).map(bucket => ({
            path: join('/', bucket.Name),
            name: bucket.Name,
            dir: true,
            size: 0,
            modified: bucket.CreationDate ? new Date(bucket.CreationDate) : new Date()
        }))
    }

    private connection: S3Client
}