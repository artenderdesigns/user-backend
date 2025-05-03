import Project from "../models/ProjectModel.js";

export const fetchProjects = async (req, res) => {
  try {
    // Await the result of the async find operation
    const projects = await Project.find();

    // Return a successful response with the fetched projects
    return res.status(200).json({
      msg: "Projects fetched successfully",
      projects,
    });
  } catch (error) {
    // Log and return an error response if something goes wrong
    console.error(error);
    return res.status(500).json({
      msg: "Internal server error",
      error: error.message,
    });
  }
};

export default fetchProjects;
