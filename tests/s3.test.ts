import {describe, expect, test} from '@jest/globals'
import { S3Client, 
  ListBucketsCommand, ListBucketsCommandOutput,
  ListObjectsCommand, ListObjectsCommandOutput,
  GetObjectCommand, GetObjectCommandOutput,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand
 } from "@aws-sdk/client-s3";
import * as fs from 'node:fs';
import { NodeJsRuntimeStreamingBlobPayloadOutputTypes } from "@smithy/types"
import S3 from '../src/fs/S3'

 // example of using @aws-sdk/client-s3
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html
// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/


describe('S3', () => {

  let client: S3Client
  let conn: S3

  beforeAll(() => {
    client = new S3Client({ 
      endpoint: process.env.S3_URL,
      region: "us-east-1",      // Some services require a region, even if not AWS, The default region, particularly for legacy or unspecified requests
      forcePathStyle: true, // Needed for MinIO and some other non-AWS services
      credentials: {
        accessKeyId: process.env.S3_KEY!,
        secretAccessKey: process.env.S3_SECRET!
      }
    })

    conn = new S3(
      process.env.S3_URL!,
      process.env.S3_KEY!,
      process.env.S3_SECRET!,
      'us-east-1',
      443,
      (e) => {
        console.log('ERROR OCCURED: ', e)
      }
    )
  });

  test('List buckets', async () => {
    const command = new ListBucketsCommand({});
    // Beginning October 1, 2025, Amazon S3 will stop returning DisplayName
    try {
      const data: ListBucketsCommandOutput = await client.send(command);
      console.log(
        data,
        // data.Buckets?.map(bucket => bucket.Name + ' ' + bucket.CreationDate)
      )
    } catch (error) {
      console.log('ERROR: ', error)
    }
  });


  test('List files', async () => {
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/ListObjectsCommand/
    try {
      console.log(
        await conn.ls(await conn.pwd()),
        await conn.ls(`/${process.env.S3_BUCKET}`),
        await conn.ls(`/${process.env.S3_BUCKET}/b`)
      )

      // const data: ListObjectsCommandOutput = await client.send(new ListObjectsCommand({
      //   Bucket: process.env.S3_BUCKET,
      //   Delimiter: '/',
      //   Prefix: 'b/', // - in subfolder
      //   MaxKeys: 1000   // 1000 is maximum number
      //   // Marker: cursor,  Marker is where you want Amazon S3 to start listing from. Amazon S3 starts listing after this specified key. Marker can be any key in the bucket.
      // }));
      
      // console.log(
      //   data
      //   // data.Contents?.map(item => [item.Key, item.LastModified, item.Size])
      // )

      /* если указать Delimiter
        CommonPrefixes: [ { Prefix: 'aaa/' }, { Prefix: 'z/' } ],
        Contents: [
          Key: 'fil1.json',
          Key: 'file2.json',
        ]

        When you specify a delimiter, S3 analyzes object keys and:
        - Returns objects before the delimiter in Contents
        - Returns common prefixes (virtual "folders") after the delimiter in CommonPrefixes
        S3 returns a more structured response
      */
    } catch (error) {
      console.log('ERROR: ', error)
    }
    /*
    aaa/      <- folder
    aaa/bbb/
    aaa/tsconfig.json
    aaa/bbb/.babelrc.json
    package.json

    In Amazon S3, a prefix is the part of an object key that comes before the object name, similar to a directory path in a filesystem. Since S3 has a flat structure (not truly hierarchical), prefixes help organize and query objects in a folder-like manner.
    */
  })

  test('Upload', async () => {

    // conn.put(
    //   '/Users/maximmiroshnikov/projects/filefive/jest.setup.ts',
    //   `/${process.env.S3_BUCKET}/a/test.ts`
    // )


    const filePath = '/Users/maximmiroshnikov/projects/filefive/jest.setup.ts'

    // const f = fs.readFileSync('/Users/maximmiroshnikov/projects/filefive/jest.setup.ts');
    const f = fs.createReadStream('/Users/maximmiroshnikov/projects/filefive/jest.setup.ts');

    // try {
    //   const data = await client.send(new PutObjectCommand({
    //     Bucket: process.env.S3_BUCKET,
    //     Key: 'jest.setup.ts',
    //     Body: f
    //   }));
    //   console.log(data)
    //   console.log('File uploaded successfully:', data);
    // } catch (err) {
    //   console.error('Error uploading file:', err);
    // }



    // For files larger than 100MB, consider using multipart upload:

    // const { UploadId } = await client.send(
    //   new CreateMultipartUploadCommand({
    //     Bucket: process.env.S3_BUCKET,
    //     Key: 'jest.setup.ts'
    //   })
    // )

    // const partSize = 5 * 1024 * 1024
    // const fileStream = fs.createReadStream(filePath, { highWaterMark: partSize });
    // let buffer: any[] = [];
    // let partNumber = 1
    // const parts: { ETag: string|undefined, PartNumber: number }[] = []
    // for await (const chunk of fileStream) {
    //   buffer.push(chunk);

    //   if (buffer.length >= partSize) {
    //     const partParams = {
    //       Bucket: process.env.S3_BUCKET,
    //       Key: 'jest.setup.ts',
    //       PartNumber: partNumber,
    //       UploadId,
    //       Body: Buffer.concat(buffer)
    //     };
        
    //     const { ETag } = await client.send(new UploadPartCommand(partParams));
    //     parts.push({ ETag, PartNumber: partNumber });
    //     console.log(`Uploaded part ${partNumber}`);
        
    //     partNumber++;
    //     buffer = [];
    //   }
    // }

    //     // Upload remaining data
    // if (buffer.length > 0) {
    //   const partParams = {
    //     Bucket: process.env.S3_BUCKET,
    //     Key: 'jest.setup.ts',
    //     PartNumber: partNumber,
    //     UploadId,
    //     Body: Buffer.concat(buffer)
    //   };
      
    //   const { ETag } = await client.send(new UploadPartCommand(partParams));
    //   parts.push({ ETag, PartNumber: partNumber });
    //   console.log(`Uploaded final part ${partNumber}`);
    // }

    //     // Complete the upload
    // const data = await client.send(
    //   new CompleteMultipartUploadCommand({
    //     Bucket: process.env.S3_BUCKET,
    //     Key: 'jest.setup.ts',
    //     UploadId,
    //     MultipartUpload: { Parts: parts }
    //   })
    // );


  })

  test('Download', async () => {
      conn.get(
        `/${process.env.S3_BUCKET}/a/test.ts`,
        __dirname + '/zzz.ts'
      )

    // const data: GetObjectCommandOutput = await client.send(new GetObjectCommand({
    //   Bucket: process.env.S3_BUCKET,
    //   Key: 'a/test2.ts'
    // }))

    // if (data.Body) {
    //   const body = data.Body as NodeJsRuntimeStreamingBlobPayloadOutputTypes
    //   const writeStream = fs.createWriteStream('/Users/maximmiroshnikov/projects/filefive/tests/test2.ts');
    //   body.pipe(writeStream)

    //   return new Promise((resolve, reject) => {
    //     writeStream.on('finish', () => {
    //       console.log(`File downloaded successfully to`);
    //       resolve('ok')
    //     });
        
    //     writeStream.on('error', (err) => {
    //       console.error('Error writing file:', err);
    //       reject(err)
    //     });
    //   });
    // }
  })

  test('rm', async () => {
    conn.rm(`/${process.env.S3_BUCKET}/a`, true)


    // try {
    //   const data = await client.send(new DeleteObjectCommand({
    //     Bucket: process.env.S3_BUCKET,
    //     Key: 'a/test2.ts'
    //   }));
    // } catch (err) {
    //   console.error('Error deleting object:', err);
    // }
  })



  test('mkdir', async () => {
    await conn.mkdir(`/${process.env.S3_BUCKET}/test-folder`)

    // Key: 'a/',   // the illusion of a folder by uploading an empty object with a trailing slash.
    // Size: 0,

    // try {
    //   const data = await client.send(new PutObjectCommand({
    //     Bucket: process.env.S3_BUCKET,
    //     Key: 'b/',
    //     Body: ''
    //   }));
    //   console.log('Folder created successfully:', data);
    // } catch (err) {
    //   console.error('Error creating folder:', err);
    // }
  })

    test('copy mv rename', async () => {
      // await conn.cp(
      //   `/${process.env.S3_BUCKET}/test-folder/`,
      //   `/${process.env.S3_BUCKET}/my-folder/`,
      //   true
      // )

      // await conn.rename(
      //   `/${process.env.S3_BUCKET}/test-folder/LICENSE`,
      //   `/${process.env.S3_BUCKET}/test-folder/newname`
      // )



      // try {
      //   const data = await client.send(new CopyObjectCommand({
      //     Bucket: process.env.S3_BUCKET,
      //     CopySource: `/${process.env.S3_BUCKET}/${encodeURIComponent('a/jest.config.js')}`,
      //     Key: 'a/new.js'
      //   }));
      //   console.log('copied successfully:', data);

      //   // then delete. send(new DeleteObjectCommand())

      // } catch (err) {
      //   console.error('Error copying:', err);
      // }
  })

  test.only('write', async () => {
    await conn.write(
      '/5d1a214b4700-max-files/my-folder/package.json',
      'abc123'
    )
  })
  
});
