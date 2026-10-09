import fs from 'fs';
import path from 'path';

const fileWriteQueues = new Map<string, Promise<void>>();

/**
 * Atomically writes content to a file by writing to a temporary file
 * and executing an atomic fs.renameSync operation, preventing JSON corruption
 * and data loss during concurrent requests or process crashes.
 */
export const atomicWriteFile = async (filePath: string, content: string | Buffer): Promise<void> => {
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lastTask = fileWriteQueues.get(absolutePath) || Promise.resolve();

  const currentTask = lastTask.then(async () => {
    const tempPath = `${absolutePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      await fs.promises.writeFile(tempPath, content, 'utf-8');
      await fs.promises.rename(tempPath, absolutePath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }
      throw err;
    }
  });

  fileWriteQueues.set(absolutePath, currentTask);
  return currentTask;
};

/**
 * Synchronous atomic file write fallback.
 */
export const atomicWriteFileSync = (filePath: string, content: string | Buffer): void => {
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${absolutePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, absolutePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
    throw err;
  }
};
