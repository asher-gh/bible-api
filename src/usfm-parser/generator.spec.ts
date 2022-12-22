import { describe, expect, it } from 'vitest';
import { bookIdMap, generate, InputFile, InputTranslationMetadata, OutputFile } from './generator';
import Genesis from '../../bible/bsb/01GENBSB.usfm?raw';
import Exodus from '../../bible/bsb/02EXOBSB.usfm?raw';

// const genesisBsb = `\id GEN - Berean Study Bible
// \\h Genesis
// \\toc1 Genesis
// \\mt1 Genesis
// \\c 1
// \\s1 The Creation
// \\r (John 1:1–5; Hebrews 11:1–3)
// \\b
// \\m 
// \\v 1 In the beginning God created the heavens and the earth. 
// \\b
// \\m 
// \\v 2 Now the earth was formless and void, and darkness was over the surface of the deep. And the Spirit of God was hovering over the surface of the waters. `;

describe('bookIdMap', () => {
    it('should have all the books', () => {
        expect(bookIdMap).toMatchSnapshot();
    });
});

describe('generator()', () => {

    it('should output a file tree', () => {
        let translation1: InputTranslationMetadata = {
            id: 'bsb',
            name: 'Berean Standard Bible',
            shortName: 'BSB',
            language: 'en',
            licenseUrl: 'https://berean.bible/terms.htm',
            website: 'https://berean.bible'
        };

        let inputFiles = [
            {
                fileType: 'usfm',
                metadata: {
                    translation: translation1
                },
                content: firstXLines(Genesis, 13)
            },
            {
                fileType: 'usfm',
                metadata: {
                    translation: translation1
                },
                content: firstXLines(Exodus, 14)
            }
        ] as InputFile[];

        const generated = generate(inputFiles);

        const tree = fileTree(generated);

        const expectedTranslation = {
            id: 'bsb',
            name: 'Berean Standard Bible',
            shortName: 'BSB',
            language: 'en',
            licenseUrl: 'https://berean.bible/terms.htm',
            website: 'https://berean.bible',
            availableFormats: [
                'json'
            ],
            listOfBooksApiLink: '/bible/bsb/books',
        }

        expect(tree).toEqual({
            '/bible/available_translations': {
                translations: [
                    expectedTranslation
                ]
            },
            '/bible/bsb/books': {
                translation: expectedTranslation,
                books: [
                    {
                        id: 'GEN',
                        commonName: 'Genesis',
                        numberOfChapters: 1,
                        firstChapterApiLink: '/bible/bsb/Genesis/1.json'
                    },
                    {
                        id: 'EXO',
                        commonName: 'Exodus',
                        numberOfChapters: 1,
                        firstChapterApiLink: '/bible/bsb/Exodus/1.json'
                    }
                ]
            },
            '/bible/bsb/Genesis/1.json': {
                translation: expectedTranslation,
                book: {
                    id: 'GEN',
                    commonName: 'Genesis',
                    numberOfChapters: 1,
                    firstChapterApiLink: '/bible/bsb/Genesis/1.json'
                },
                nextChapterLink: null,
                chapter: {
                    number: 1,
                    content: [
                        {
                            type: 'heading',
                            content: [
                                'The Creation'
                            ]
                        },
                        {
                            type: 'line_break'
                        },
                        {
                            type: 'verse',
                            number: 1,
                            content: [
                                'In the beginning God created the heavens and the earth.'
                            ],
                        },
                        {
                            type: 'line_break'
                        },
                        {
                            type: 'verse',
                            number: 2,
                            content: [
                                'Now the earth was formless and void, and darkness was over the surface of the deep. And the Spirit of God was hovering over the surface of the waters.'
                            ],
                        },
                    ],
                    footnotes: []
                }
            },
            '/bible/bsb/Exodus/1.json': {
                translation: expectedTranslation,
                book: {
                    id: 'EXO',
                    commonName: 'Exodus',
                    numberOfChapters: 1,
                    firstChapterApiLink: '/bible/bsb/Exodus/1.json'
                },
                nextChapterLink: null,
                chapter: {
                    number: 1,
                    content: [
                        {
                            type: 'heading',
                            content: [
                                'The Israelites Multiply in Egypt'
                            ]
                        },
                        {
                            type: 'line_break'
                        },
                        {
                            type: 'verse',
                            number: 1,
                            content: [
                                'These are the names of the sons of Israel who went to Egypt with Jacob, each with his family:'
                            ],
                        },
                        {
                            type: 'line_break'
                        },
                        {
                            type: 'verse',
                            number: 2,
                            content: [
                                'Reuben, Simeon, Levi, and Judah;'
                            ],
                        },
                    ],
                    footnotes: []
                }
            }
        });
    });

});

function firstXLines(content: string, x: number) {
    const lines = content.split('\n');
    return lines.slice(0, x).join('\n');
}

function fileTree(outputFiles: OutputFile[]): any {
    let result: any = {};

    for (let file of outputFiles) {
        result[file.path] = JSON.parse(file.content);
    }

    return result;
}