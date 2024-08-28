#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { mkdir } from 'fs/promises';
import { DOMParser, Element, Node } from 'linkedom';
import { downloadFile } from './downloads';
import { uploadApiFilesFromDatabase } from './uploads';
import {
    fetchAudio,
    fetchTranslations,
    generateTranslationFiles,
    generateTranslationsFiles,
    importTranslation,
    importTranslations,
    initDb,
    uploadTestTranslation,
    uploadTestTranslations,
} from './actions';
import { getPrismaDbFromDir } from './db';
import { confirm } from '@inquirer/prompts';

async function start() {
    const parser = new DOMParser();
    globalThis.DOMParser = DOMParser as any;
    globalThis.Element = Element as any;
    globalThis.Node = Node as any;

    const program = new Command();

    program
        .name('helloao')
        .description('A CLI for managing a Free Use Bible API.')
        .version('0.0.1');

    program
        .command('init [path]')
        .description('Initialize a new Bible API DB.')
        .option('--source <path>', 'The source database to copy from.')
        .option(
            '--language <languages...>',
            'The language(s) that the database should be initialized with.'
        )
        .action(async (dbPath: string, options: any) => {
            await initDb(dbPath, options);
        });

    program
        .command('import-translation <dir> [dirs...]')
        .description(
            'Imports a translation from the given directory into the database.'
        )
        .option('--overwrite', 'Whether to overwrite existing files.')
        .action(async (dir: string, dirs: string[], options: any) => {
            await importTranslation(dir, dirs, options);
        });

    program
        .command('import-translations <dir>')
        .description(
            'Imports all translations from the given directory into the database.'
        )
        .option('--overwrite', 'Whether to overwrite existing files.')
        .action(async (dir: string, options: any) => {
            await importTranslations(dir, options);
        });

    program
        .command('upload-test-translation <input>')
        .description(
            `Uploads a translation to the HelloAO Free Bible API test S3 bucket.\nRequires access to the HelloAO Free Bible API test S3 bucket.\nFor inquiries, please contact hello@helloao.org.`
        )
        .option(
            '--batch-size <size>',
            'The number of translations to generate API files for in each batch.',
            '50'
        )
        .option(
            '--translations <translations...>',
            'The translations to generate API files for.'
        )
        .option('--overwrite', 'Whether to overwrite existing files.')
        .option(
            '--overwrite-common-files',
            'Whether to overwrite only common files.'
        )
        .option(
            '--file-pattern <pattern>',
            'The file pattern regex that should be used to filter the files that are generated.'
        )
        .option(
            '--use-common-name',
            'Whether to use the common name for the book chapter API link. If false, then book IDs are used.'
        )
        .option(
            '--generate-audio-files',
            'Whether to replace the audio URLs in the dataset with ones that are hosted locally.'
        )
        .option(
            '--profile <profile>',
            'The AWS profile to use for uploading to S3.'
        )
        .option(
            '--access-key-id <accessKeyId>',
            'The AWS access key ID to use for uploading to S3.'
        )
        .option(
            '--secret-access-key <secretAccessKey>',
            'The AWS Secret Access Key to use for uploading to S3.'
        )
        .option('--pretty', 'Whether to generate pretty-printed JSON files.')
        .option(
            '--s3-url <s3Url>',
            'The S3 bucket URL to upload the files to.',
            's3://ao-bible-api-public-uploads'
        )
        .action(async (input: string, options: any) => {
            const good = await confirm({
                message:
                    'Uploaded files will be publicly accessible. Continue?',
                default: false,
            });
            if (!good) {
                return;
            }

            const result = await uploadTestTranslation(input, options);

            console.log('\nVersion:', result.version);
            console.log('Uploaded to:', result.uploadS3Url);
            console.log('URL:', result.url);
            console.log(
                'Available Translations:',
                result.availableTranslationsUrl
            );
        });

    program
        .command('upload-test-translations <input>')
        .description(
            `Uploads all the translations in the given input directory to the HelloAO Free Bible API test S3 bucket.\nRequires access to the HelloAO Free Bible API test S3 bucket.\nFor inquiries, please contact hello@helloao.org.`
        )
        .option(
            '--batch-size <size>',
            'The number of translations to generate API files for in each batch.',
            '50'
        )
        .option(
            '--translations <translations...>',
            'The translations to generate API files for.'
        )
        .option('--overwrite', 'Whether to overwrite existing files.')
        .option(
            '--overwrite-common-files',
            'Whether to overwrite only common files.'
        )
        .option(
            '--file-pattern <pattern>',
            'The file pattern regex that should be used to filter the files that are generated.'
        )
        .option(
            '--use-common-name',
            'Whether to use the common name for the book chapter API link. If false, then book IDs are used.'
        )
        .option(
            '--generate-audio-files',
            'Whether to replace the audio URLs in the dataset with ones that are hosted locally.'
        )
        .option(
            '--profile <profile>',
            'The AWS profile to use for uploading to S3.'
        )
        .option(
            '--access-key-id <accessKeyId>',
            'The AWS access key ID to use for uploading to S3.'
        )
        .option(
            '--secret-access-key <secretAccessKey>',
            'The AWS Secret Access Key to use for uploading to S3.'
        )
        .option('--pretty', 'Whether to generate pretty-printed JSON files.')
        .option(
            '--s3-url <s3Url>',
            'The S3 bucket URL to upload the files to.',
            's3://ao-bible-api-public-uploads'
        )
        .action(async (input: string, options: any) => {
            const good = await confirm({
                message:
                    'Uploaded files will be publicly accessible. Continue?',
                default: false,
            });

            if (!good) {
                return;
            }

            const result = await uploadTestTranslations(input, options);

            console.log('\nVersion:', result.version);
            console.log('Uploaded to:', result.uploadS3Url);
            console.log('URL:', result.url);
            console.log(
                'Available Translations:',
                result.availableTranslationsUrl
            );
        });

    program
        .command('generate-translation-files <input> <dir>')
        .description('Generates API files from the given input translation.')
        .option(
            '--batch-size <size>',
            'The number of translations to generate API files for in each batch.',
            '50'
        )
        .option(
            '--translations <translations...>',
            'The translations to generate API files for.'
        )
        .option('--overwrite', 'Whether to overwrite existing files.')
        .option(
            '--overwrite-common-files',
            'Whether to overwrite only common files.'
        )
        .option(
            '--file-pattern <pattern>',
            'The file pattern regex that should be used to filter the files that are generated.'
        )
        .option(
            '--use-common-name',
            'Whether to use the common name for the book chapter API link. If false, then book IDs are used.'
        )
        .option(
            '--generate-audio-files',
            'Whether to replace the audio URLs in the dataset with ones that are hosted locally.'
        )
        .option(
            '--profile <profile>',
            'The AWS profile to use for uploading to S3.'
        )
        .option(
            '--access-key-id <accessKeyId>',
            'The AWS access key ID to use for uploading to S3.'
        )
        .option(
            '--secret-access-key <secretAccessKey>',
            'The AWS Secret Access Key to use for uploading to S3.'
        )
        .option('--pretty', 'Whether to generate pretty-printed JSON files.')
        .action(async (input: string, dest: string, options: any) => {
            await generateTranslationFiles(input, dest, options);
        });

    program
        .command('generate-translations-files <input> <dir>')
        .description('Generates API files from the given input translations.')
        .option(
            '--batch-size <size>',
            'The number of translations to generate API files for in each batch.',
            '50'
        )
        .option(
            '--translations <translations...>',
            'The translations to generate API files for.'
        )
        .option('--overwrite', 'Whether to overwrite existing files.')
        .option(
            '--overwrite-common-files',
            'Whether to overwrite only common files.'
        )
        .option(
            '--file-pattern <pattern>',
            'The file pattern regex that should be used to filter the files that are uploaded.'
        )
        .option(
            '--use-common-name',
            'Whether to use the common name for the book chapter API link. If false, then book IDs are used.'
        )
        .option(
            '--generate-audio-files',
            'Whether to replace the audio URLs in the dataset with ones that are hosted locally.'
        )
        .option(
            '--profile <profile>',
            'The AWS profile to use for uploading to S3.'
        )
        .option(
            '--access-key-id <accessKeyId>',
            'The AWS access key ID to use for uploading to S3.'
        )
        .option(
            '--secret-access-key <secretAccessKey>',
            'The AWS Secret Access Key to use for uploading to S3.'
        )
        .option('--pretty', 'Whether to generate pretty-printed JSON files.')
        .action(async (input: string, dest: string, options: any) => {
            await generateTranslationsFiles(input, dest, options);
        });

    program
        .command('upload-api-files')
        .argument('<dest>', 'The destination to upload the API files to.')
        .description(
            'Uploads API files to the specified destination. For S3, use the format s3://bucket-name/path/to/folder.'
        )
        .option(
            '--batch-size <size>',
            'The number of translations to generate API files for in each batch.',
            '50'
        )
        .option(
            '--translations <translations...>',
            'The translations to generate API files for.'
        )
        .option('--overwrite', 'Whether to overwrite existing files.')
        .option(
            '--overwrite-common-files',
            'Whether to overwrite only common files.'
        )
        .option(
            '--file-pattern <pattern>',
            'The file pattern regex that should be used to filter the files that are uploaded.'
        )
        .option(
            '--use-common-name',
            'Whether to use the common name for the book chapter API link. If false, then book IDs are used.'
        )
        .option(
            '--generate-audio-files',
            'Whether to replace the audio URLs in the dataset with ones that are hosted locally.'
        )
        .option(
            '--profile <profile>',
            'The AWS profile to use for uploading to S3.'
        )
        .option(
            '--access-key-id <accessKeyId>',
            'The AWS access key ID to use for uploading to S3.'
        )
        .option(
            '--secret-access-key <secretAccessKey>',
            'The AWS Secret Access Key to use for uploading to S3.'
        )
        .option('--pretty', 'Whether to generate pretty-printed JSON files.')
        .action(async (dest: string, options: any) => {
            const db = getPrismaDbFromDir(process.cwd());
            try {
                await uploadApiFilesFromDatabase(db, dest, options);
            } finally {
                db.$disconnect();
            }
        });

    program
        .command('fetch-translations <dir> [translations...]')
        .description(
            'Fetches the specified translations from fetch.bible and places them in the given directory.'
        )
        .option(
            '-a, --all',
            'Fetch all translations. If omitted, only undownloaded translations will be fetched.'
        )
        .action(async (dir: string, translations: string[], options: any) => {
            await fetchTranslations(dir, translations, options);
        });

    program
        .command('fetch-audio <dir> [translations...]')
        .description(
            'Fetches the specified audio translations and places them in the given directory.\nTranslations should be in the format "translationId/audioId". e.g. "BSB/gilbert"'
        )
        .option(
            '-a, --all',
            'Fetch all translations. If omitted, only undownloaded translations will be fetched.'
        )
        .action(async (dir: string, translations: string[], options: any) => {
            await fetchAudio(dir, translations, options);
        });

    program
        .command('fetch-bible-metadata <dir>')
        .description(
            'Fetches the Theographic bible metadata and places it in the given directory.'
        )
        .action(async (dir: string) => {
            let files = [
                'books.json',
                'chapters.json',
                'easton.json',
                'events.json',
                'people.json',
                'peopleGroups.json',
                'periods.json',
                'places.json',
                'verses.json',
            ];

            await mkdir(dir, { recursive: true });

            let promises = files.map(async (file) => {
                const url = `https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/json/${file}`;
                const fullPath = path.resolve(dir, file);
                await downloadFile(url, fullPath);
            });

            await Promise.all(promises);
        });

    await program.parseAsync(process.argv);
}

start();
