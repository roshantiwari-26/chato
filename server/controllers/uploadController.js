const cloudinary = require("../config/cloudinary");

const uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Image is required",
    });
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "chato/images",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );

    stream.end(req.file.buffer);
  });

  res.json({
    imageUrl: result.secure_url,
  });
};

module.exports = {
  uploadImage,
};
