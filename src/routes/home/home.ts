import { createCanvas, loadImage } from "canvas";
import { createWorker } from "tesseract.js";
import sizeOf from "image-size";
import { imageProcessor, logger } from "../../utils/config";
import fs from "fs";
import { resolve } from "path";

const home = ((req: any, res: any) => {
    res.render('home', { title: 'Hey', message: 'Hello there!' })
});

async function recognize(files: any) {
    let matches: any[] = [];
    for (let i = 0; i < files.length; i++) {
        const q = files[i];
        const buffer = Buffer.from(q.data, "utf-8");
        const { width, height } = sizeOf(buffer);
        const canvas = createCanvas(1000, height || 1080);
        const context = canvas.getContext('2d');
        const file = await loadImage(buffer).then((image) => {
            context.drawImage(image, -400, 0, width, height);
            context.putImageData(imageProcessor(canvas, 1), 0, 0);
            const buff = canvas.toBuffer('image/png');
            fs.writeFileSync('./image.png', buff);
            return buff;
        });

        const worker = createWorker();
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        await worker.recognize(file).then(result => {
            let confidence = result.data.confidence;
            if (confidence < 50) return console.log("No text detected");
            let text = result.data.text.split("\n");
            const regex = /(.*) \((.*)\) (\d)/g;
            for (let i = 0; i < text.length; i++) {
                const match = regex.exec(result.data.text);
                if (match) {
                    let json = {};
                    json['name'] = match[1].replace("@", "").trim();
                    json['class'] = match[2];
                    json['number'] = match[3];
                    matches.push(
                        new Promise(resolve => {
                            resolve(json);
                        })
                    );
                }
            }
        });
        await worker.terminate();
    }
    return Promise.all(matches);
};

const uploader = (async (req: any, res: any) => {
    // Get Uploaded Files
    const files = req.files.file;
    const array: any[] = [];

    if (files.length  === undefined) {
        array.push(files);
    }
    const f = files.length === undefined ? array : files;
    logger.info(`Recognizing ${f.length} images`);
    const r = await recognize(f);
    const csv = r.map(row => Object.values(row).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=output.csv');
    res.send(csv);
});


export { home, uploader };