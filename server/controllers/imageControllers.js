import userModel from "../models/userModel.js";
import FormData from "form-data";
import axios from "axios";

export const generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    if (!user || !prompt) {
      return res.json({ sucess: false, message: "missing Details" });
    }

    if (user.creditBalance === 0 || user.creditBalance < 0) {
      return res.json({
        sucess: false,
        message: "No credits Balance",
        creditBalance: user.creditBalance,
      });
    }

    const formdata = new FormData();
    formdata.append("prompt", prompt);

    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formdata,
      {
        headers: {
          "x-api-key": process.env.CLIPDROP_API,
        },
        responseType: "arraybuffer",
      }
    );

    const base64Image = Buffer.from(data, "binary").toString("base64");
    const resultImage = `data:image/png;base64,${base64Image}`;

    await userModel.findByIdAndUpdate(user._id, {
      creditBalance: user.creditBalance - 1,
    });

    res.json({
      success: true,
      message: "Image Generated",
      creditBalance: user.creditBalance - 1,
      resultImage,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ sucess: false, message: error.message });
  }
};
