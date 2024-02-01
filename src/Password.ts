import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'


export default class Password {

    static async load(dir: string) {
        this.saveFile = join(dir, 'credentials.json')
        this.store = new Map(
            (JSON.parse(
                (await readFile(this.saveFile)).toString()
            ) as [string, string][]).map(([key, password]) => [key, password])
        )
    }

    static set(key: string, password: string) {
        this.store.set(key, password)
        writeFile(
            this.saveFile,
            JSON.stringify(
                Array.from(this.store.entries()).map(([key, password]) => [key, password])
            )            
        )
    }

    static get(key: string) {
        return this.store.get(key) ?? ''
    }

    private static store: Map<string, string>
    private static saveFile = ''
}


/*
https://stackoverflow.com/questions/6953286/how-to-encrypt-data-that-needs-to-be-decrypted-in-node-js


var crypto = require('crypto');
var assert = require('assert');

require('dotenv').config();



var algorithm = 'aes256'; // or any other algorithm supported by OpenSSL
var secret = process.env.SECRET;
var text = 'I love kittens';

var cipher = crypto.createCipher(algorithm, secret);  
var encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
var decipher = crypto.createDecipher(algorithm, secret);
var decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');

assert.equal(decrypted, text);
*/