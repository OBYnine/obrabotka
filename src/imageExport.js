// imageExport.js

export function saveAsPNG(image) {
    const link = document.createElement('a');
    link.download = 'image.png';
    link.href = image.toDataURL('image/png');
    link.click();
}

export function saveAsJPG(image) {
    const link = document.createElement('a');
    link.download = 'image.jpg';
    link.href = image.toDataURL('image/jpeg');
    link.click();
}

export function saveAsGB7(pixelData, width, height, hasMask = false) {
    const buffer = new ArrayBuffer(12 + pixelData.length);
    const header = new DataView(buffer, 0, 12);
    header.setUint8(0, 0x47); // G
    header.setUint8(1, 0x42); // B
    header.setUint8(2, 0x37); // 7
    header.setUint8(3, 0x1D); // ·
    header.setUint8(4, 0x01); // version
    header.setUint8(5, hasMask ? 0x01 : 0x00);
    header.setUint16(6, width, false); // BE
    header.setUint16(8, height, false);
    header.setUint16(10, 0x00, false);

    const pixelArray = new Uint8Array(buffer, 12);
    pixelArray.set(pixelData);

    const blob = new Blob([buffer], { type: 'application/gb7' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'image.gb7';
    link.click();
    URL.revokeObjectURL(url);
}