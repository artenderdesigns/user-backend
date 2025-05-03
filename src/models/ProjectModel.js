import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
  Project_Name: {
    type: String,
  },
  Project_Image: {
    type: String, // This will store the Cloudinary image URL
  },
  Project_Description: {
    type: String,
  },
  Category: {
    type: [String],
  },
  Services: {
    type: String,
  },
  OnHomePage: {
    type: Boolean,
  },
});

const Project = mongoose.model("Project", ProjectSchema);

export default Project;
