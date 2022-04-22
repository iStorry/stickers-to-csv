
function imageProcessor(canvas: any, threshhold: number | undefined) {
    const ctx = canvas.getContext('2d');
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    //blurARGB(image.data, canvas, 1);
    // dilate(image.data, canvas);
    invertColors(image.data);
    thresholdFilter(image.data, threshhold);
    return image;
}


function thresholdFilter(pixels: any, level: number | undefined) {
    if (level === undefined) {
        level = 0.5;
    }
    const thresh = Math.floor(level * 255);
    for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];

        const gray = 2 * red + 1 * green + 2 * blue;
        let value: number;
        if (gray >= thresh) {
            value = 255;
        } else {
            value = 0;
        }
        pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
    }
};

function getARGB(data: number[], i: number) {
    const offset = i * 4;
    return (
        ((data[offset + 3] << 24) & 0xff000000) |
        ((data[offset] << 16) & 0x00ff0000) |
        ((data[offset + 1] << 8) & 0x0000ff00) |
        (data[offset + 2] & 0x000000ff)
    );
};


function setPixels(pixels: any[], data: Int32Array | number[]) {
    let offset = 0;
    for (let i = 0, al = pixels.length; i < al; i++) {
        offset = i * 4;
        pixels[offset + 0] = (data[i] & 0x00ff0000) >>> 16;
        pixels[offset + 1] = (data[i] & 0x0000ff00) >>> 8;
        pixels[offset + 2] = data[i] & 0x000000ff;
        pixels[offset + 3] = (data[i] & 0xff000000) >>> 24;
    }
};


// internal kernel stuff for the gaussian blur filter
let blurRadius: number;
let blurKernelSize: number;
let blurKernel: Int32Array;
let blurMult: any[] = [];

// from https://github.com/processing/p5.js/blob/main/src/image/filters.js
function buildBlurKernel(r: number) {
    let radius = (r * 3.5) | 0;
    radius = radius < 1 ? 1 : radius < 248 ? radius : 248;

    if (blurRadius !== radius) {
        blurRadius = radius;
        blurKernelSize = (1 + blurRadius) << 1;
        blurKernel = new Int32Array(blurKernelSize);
        blurMult = new Array(blurKernelSize);
        for (let l = 0; l < blurKernelSize; l++) {
            blurMult[l] = new Int32Array(256);
        }

        let bk: number, bki: number;
        let bm: number[], bmi: number[];

        for (let i = 1, radiusi = radius - 1; i < radius; i++) {
            blurKernel[radius + i] = blurKernel[radiusi] = bki = radiusi * radiusi;
            bm = blurMult[radius + i];
            bmi = blurMult[radiusi--];
            for (let j = 0; j < 256; j++) {
                bm[j] = bmi[j] = bki * j;
            }
        }
        bk = blurKernel[radius] = radius * radius;
        bm = blurMult[radius];

        for (let k = 0; k < 256; k++) {
            bm[k] = bk * k;
        }
    }
}

// from https://github.com/processing/p5.js/blob/main/src/image/filters.js
function blurARGB(pixels: any, canvas: { width: any; height: any; }, radius: any) {
    const width = canvas.width;
    const height = canvas.height;
    const numPackedPixels = width * height;
    const argb = new Int32Array(numPackedPixels);
    for (let j = 0; j < numPackedPixels; j++) {
        argb[j] = getARGB(pixels, j);
    }
    let sum: number, cr: number, cg: number, cb: number, ca: number;
    let read: number, ri: number, ym: number, ymi: number, bk0: number;
    const a2 = new Int32Array(numPackedPixels);
    const r2 = new Int32Array(numPackedPixels);
    const g2 = new Int32Array(numPackedPixels);
    const b2 = new Int32Array(numPackedPixels);
    let yi = 0;
    buildBlurKernel(radius);
    let x: number, y: number, i: number;
    let bm: any[];
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            cb = cg = cr = ca = sum = 0;
            read = x - blurRadius;
            if (read < 0) {
                bk0 = -read;
                read = 0;
            } else {
                if (read >= width) {
                    break;
                }
                bk0 = 0;
            }
            for (i = bk0; i < blurKernelSize; i++) {
                if (read >= width) {
                    break;
                }
                const c = argb[read + yi];
                bm = blurMult[i];
                ca += bm[(c & -16777216) >>> 24];
                cr += bm[(c & 16711680) >> 16];
                cg += bm[(c & 65280) >> 8];
                cb += bm[c & 255];
                sum += blurKernel[i];
                read++;
            }
            ri = yi + x;
            a2[ri] = ca / sum;
            r2[ri] = cr / sum;
            g2[ri] = cg / sum;
            b2[ri] = cb / sum;
        }
        yi += width;
    }
    yi = 0;
    ym = -blurRadius;
    ymi = ym * width;
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            cb = cg = cr = ca = sum = 0;
            if (ym < 0) {
                bk0 = ri = -ym;
                read = x;
            } else {
                if (ym >= height) {
                    break;
                }
                bk0 = 0;
                ri = ym;
                read = x + ymi;
            }
            for (i = bk0; i < blurKernelSize; i++) {
                if (ri >= height) {
                    break;
                }
                bm = blurMult[i];
                ca += bm[a2[read]];
                cr += bm[r2[read]];
                cg += bm[g2[read]];
                cb += bm[b2[read]];
                sum += blurKernel[i];
                ri++;
                read += width;
            }
            argb[x + yi] =
                ((ca / sum) << 24) |
                ((cr / sum) << 16) |
                ((cg / sum) << 8) |
                (cb / sum);
        }
        yi += width;
        ymi += width;
        ym++;
    }
    setPixels(pixels, argb);
}

function invertColors(pixels: any[]) {
    for (var i = 0; i < pixels.length; i += 4) {
        pixels[i] = pixels[i] ^ 255; // Invert Red
        pixels[i + 1] = pixels[i + 1] ^ 255; // Invert Green
        pixels[i + 2] = pixels[i + 2] ^ 255; // Invert Blue
    }
}

export { invertColors, blurARGB, buildBlurKernel, getARGB, setPixels, imageProcessor };