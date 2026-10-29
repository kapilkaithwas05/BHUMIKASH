
import multer from "multer";
import path from "node:path";

const allowedExtensions = new Set([".csv", ".xlsx"]);

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  callback
) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return callback(
      new Error("Only CSV and XLSX files are allowed")
    );
  }

  callback(null, true);
};

export const uploadStudentList = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },
});
