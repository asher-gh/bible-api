import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    NotFound,
} from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'; // ES6 import
import { SerializedFile, Uploader } from './files';
import { AwsCredentialIdentity, Provider } from '@smithy/types';
import { input, password } from '@inquirer/prompts';

export class S3Uploader implements Uploader {
    private _client: S3Client;

    private _bucketName: string;
    private _keyPrefix: string;

    get idealBatchSize() {
        return 50;
    }

    constructor(
        bucketName: string,
        keyPrefix: string,
        profile:
            | string
            | null
            | AwsCredentialIdentity
            | Provider<AwsCredentialIdentity>
    ) {
        this._bucketName = bucketName;
        this._keyPrefix = keyPrefix;
        this._client = new S3Client({
            credentials:
                !profile || typeof profile === 'string'
                    ? fromNodeProviderChain({ profile: profile ?? undefined })
                    : profile,
        });
    }

    async upload(file: SerializedFile, overwrite: boolean): Promise<boolean> {
        const path = file.path.startsWith('/')
            ? file.path.substring(1)
            : file.path;
        const key = this._keyPrefix ? `${this._keyPrefix}/${path}` : path;

        const hash = file.sha256?.();
        const head = new HeadObjectCommand({
            Bucket: this._bucketName,
            Key: key,
        });

        if (hash || !overwrite) {
            try {
                const existingFile = await this._client.send(head);
                if (
                    hash &&
                    hash.localeCompare(
                        existingFile?.ChecksumSHA256 ?? '',
                        undefined,
                        {
                            sensitivity: 'base',
                        }
                    ) === 0
                ) {
                    // File is already uploaded and matches the checksum.
                    console.log(`[s3] Matches checksum: ${key}`);
                    return false;
                }

                if (!overwrite) {
                    return false;
                }
            } catch (err: any) {
                if (err instanceof NotFound) {
                    // not found, so we can try to write the file.
                } else {
                    throw err;
                }
            }
        }

        const command = new PutObjectCommand({
            Bucket: this._bucketName,
            Key: key,
            Body: file.content,
            ContentType: 'application/json',
            ChecksumSHA256: hash,
        });

        await this._client.send(command);
        return true;
    }
}

/**
 * Parses the given S3 URL into its bucket name and object key.
 * @param url The URL to parse.
 */
export function parseS3Url(url: string) {
    const regex = /^s3:\/\/([a-z0-9.\-]+)(\/[^${}]*)?$/;
    const matched = url.match(regex);
    if (matched) {
        const arr = [...matched];
        let key = arr[2] ?? '';
        if (key.startsWith('/')) {
            key = key.substring(1);
        }
        return {
            bucketName: arr[1],
            objectKey: key,
        };
    }
    return undefined;
}

/**
 * Gets the HTTP URL for the given S3 URL.
 * @param s3Url The S3 URL to convert.
 */
export function getHttpUrl(s3Url: string) {
    const parsed = parseS3Url(s3Url);
    if (!parsed) {
        return undefined;
    }
    const { bucketName, objectKey } = parsed;
    if (objectKey) {
        return `https://${bucketName}.s3.amazonaws.com/${objectKey}`;
    } else {
        return `https://${bucketName}.s3.amazonaws.com`;
    }
}

/**
 * A provider that gets the credentials directly from the user input.
 */
export const askForAccessKeyProvider: Provider<
    AwsCredentialIdentity
> = async () => {
    const accessKeyId = await input({
        message: 'Enter your AWS Access Key ID',
    });
    const secretAccessKey = await password({
        message: 'Enter your AWS Secret Access Key',
    });

    return {
        accessKeyId,
        secretAccessKey,
    };
};

/**
 * Defines a provider that tries to get the credentials from the given list of providers.
 * @param providers The providers to try.
 */
export function providerChain(
    ...providers: Provider<AwsCredentialIdentity>[]
): Provider<AwsCredentialIdentity> {
    return async () => {
        for (const provider of providers) {
            const creds = await provider();
            if (creds?.accessKeyId && creds?.secretAccessKey) {
                return creds;
            }
        }

        return {
            accessKeyId: '',
            secretAccessKey: '',
        };
    };
}

/**
 * Gets the default provider for the given options.
 *
 * Defaults first to using the provided access key and secret access key, then to using the given profile, then finally to asking the user for the access key.
 * @param options
 */
export function defaultProviderForOptions(options: {
    accessKeyId?: string;
    secretAccessKey?: string;
    profile?: string;
}): Provider<AwsCredentialIdentity> | AwsCredentialIdentity {
    if (options.accessKeyId && options.secretAccessKey) {
        return {
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey,
        };
    }

    return providerChain(
        fromNodeProviderChain({ profile: options.profile }),
        askForAccessKeyProvider
    );
}
