import { Sprite } from '../components/SpritesheetExtractor';
import { v4 as uuidv4 } from 'uuid';

export class ImageProcessor {
  async processImage(
    image: HTMLImageElement,
    threshold = 128,
    minSize = 20,
    padding = 1
  ): Promise<Sprite[]> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const mask = new Uint8Array(image.width * image.height);
    const visited = new Uint8Array(image.width * image.height);
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        const a = data[i + 3];
        if (a > 2) {
          mask[y * image.width + x] = 1;
        }
      }
    }
    
    const sprites: Sprite[] = [];
    
    const isSpriteBoundary = (x: number, y: number): boolean => {
      const idx = y * image.width + x;
      if (!mask[idx]) return false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < image.width && ny >= 0 && ny < image.height) {
            const nidx = ny * image.width + nx;
            if (!mask[nidx]) {
              return true;
            }
          }
        }
      }
      return false;
    };
    const floodFill = (startX: number, startY: number) => {
      const stack: [number, number][] = [[startX, startY]];
      const bounds = {
        minX: startX,
        minY: startY,
        maxX: startX,
        maxY: startY
      };
      
      const pixels = new Set<number>();
      
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const idx = y * image.width + x;
        if (visited[idx] || !mask[idx]) continue;
        visited[idx] = 1;
        pixels.add(idx);
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < image.width && ny >= 0 && ny < image.height) {
              const nidx = ny * image.width + nx;
              if (!visited[nidx] && mask[nidx]) {
                stack.push([nx, ny]);
              }
            }
          }
        }
      }
      
      return { bounds, pixels };
    };
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const idx = y * image.width + x;
        
        if (!visited[idx] && mask[idx] && isSpriteBoundary(x, y)) {
          const { bounds, pixels } = floodFill(x, y);
          
          const width = bounds.maxX - bounds.minX + 1 + (padding * 2);
          const height = bounds.maxY - bounds.minY + 1 + (padding * 2);
          if (width < minSize || height < minSize) continue;
          const spriteCanvas = document.createElement('canvas');
          spriteCanvas.width = width;
          spriteCanvas.height = height;
          
          const spriteCtx = spriteCanvas.getContext('2d');
          if (!spriteCtx) continue;
          spriteCtx.clearRect(0, 0, width, height);
          spriteCtx.drawImage(
            image,
            bounds.minX - padding,
            bounds.minY - padding,
            width,
            height,
            0,
            0,
            width,
            height
          );
          const spriteData = spriteCtx.getImageData(0, 0, width, height);
          for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
              const x = bounds.minX + px - padding;
              const y = bounds.minY + py - padding;
              if (x >= 0 && x < image.width && y >= 0 && y < image.height) {
                const originalIdx = y * image.width + x;
                const spriteIdx = (py * width + px) * 4;
                if (!pixels.has(originalIdx)) {
                  spriteData.data[spriteIdx + 3] = 0;
                }
              }
            }
          }
          
          spriteCtx.putImageData(spriteData, 0, 0);
          
          sprites.push({
            id: uuidv4(),
            imageData: spriteData,
            canvas: spriteCanvas,
            bounds: {
              x: bounds.minX - padding,
              y: bounds.minY - padding,
              width,
              height
            }
          });
        }
      }
    }
    
    return sprites;
  }
}