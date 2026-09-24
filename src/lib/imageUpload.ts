export const compressImageToBase64 = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          reject(new Error("No se pudo obtener el contexto del canvas"));
        }
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
  });
};

/**
 * Comprime una imagen en el navegador antes de subirla para optimizar ancho de banda
 * y garantizar tiempos de carga ultrarrápidos, manteniendo alta fidelidad visual.
 */
export const compressImageToBlob = (
  file: File,
  maxWidth: number = 1600,
  quality: number = 0.85
): Promise<Blob> => {
  return new Promise((resolve) => {
    // Si es SVG o GIF animado, conservar original sin procesar en canvas
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            mimeType,
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

/**
 * Sube una imagen al almacenamiento institucional R2 y retorna la URL pública permanente.
 */
export const uploadImage = async (file: File): Promise<string> => {
  const blob = await compressImageToBlob(file);
  const formData = new FormData();
  formData.append('file', blob, file.name);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errMessage = 'Error al subir la imagen';
    try {
      const data = await res.json();
      if (data.error) errMessage = data.error;
    } catch {}
    throw new Error(errMessage);
  }

  const data = await res.json();
  if (!data.url) {
    throw new Error('No se recibió la URL de la imagen guardada');
  }

  return data.url;
};
