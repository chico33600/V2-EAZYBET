import { v2 as cloudinary } from "cloudinary";

const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (cloudinaryUrl) {
  cloudinary.config(cloudinaryUrl);
} else {
  cloudinary.config({
    cloud_name: "ddo7omht1",
    api_key: "522744459329385",
    api_secret: "DdoNQUY67Ea1qrwypolo11NmgwQ",
  });
}

export default cloudinary;
