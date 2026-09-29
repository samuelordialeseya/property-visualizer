/**
 * Pure native browser image compressor using HTML5 Canvas.
 * Zero external dependencies, zero WebAssembly, zero Web Workers.
 * 100% compatible with all mobile browsers (iOS Safari, Chrome, WebViews).
 */
export async function compressImage(file, opts = {}) {
  if (!file || typeof window === "undefined" || !file.type?.startsWith("image/")) {
    return file;
  }

  const maxDimension = opts.maxWidthOrHeight || 1400;
  const quality = opts.initialQuality || 0.82;

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(file);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(file);
                  return;
                }
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              },
              "image/jpeg",
              quality
            );
          } catch (err) {
            console.warn("Canvas compression error, using original:", err);
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = event.target?.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn("FileReader error, using original:", err);
      resolve(file);
    }
  });
}

/**
 * Converts any File object into a compact base64 data URL.
 * Used as an instant fallback when Firebase Storage is not provisioned or offline.
 */
export async function fileToDataUrl(file, maxDimension = 400, quality = 0.75) {
  if (!file || typeof window === "undefined") return null;
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(event.target.result);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(dataUrl);
          } catch {
            resolve(event.target.result);
          }
        };
        img.onerror = () => resolve(event.target?.result || null);
        img.src = event.target?.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}
