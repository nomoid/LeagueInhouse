// Test out reading ROFL file
import { promises as Fs } from 'fs'
import { parse } from './processing/parser'

function serializer(_key: any, value: any) {
    if (typeof value === 'bigint') {
        return value.toString();
    } else {
        return value;
    }
}

async function main() {
    const buf = await Fs.readFile('./data/test1.rofl');
    const metadata = await parse(buf);
    await Fs.mkdir('./output', { recursive: true });
    await Fs.writeFile('./output/test1.json', JSON.stringify(metadata, serializer));
}

main();