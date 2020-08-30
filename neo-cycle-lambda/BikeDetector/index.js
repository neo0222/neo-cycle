const AWS = require('aws-sdk');
var rekognition = new AWS.Rekognition();

exports.handler = async (event) => {
  // TODO implement
  const imageBase64 = JSON.parse(event.body).imageBase64;
  try {
    const result = await rekognition.detectText({
      Image: {
        Bytes: Buffer.from(imageBase64, 'base64')
      },
      Filters: {
        WordFilter: {
          MinConfidence: 90,
        },
      },
    }).promise();
    const maybeCycleNameList = result.TextDetections
      .filter((el) => {
          return el.Type === "WORD";
      }).map((el) => {
        return el.DetectedText;
      });
    console.log(`maybeCycleNameList: ${maybeCycleNameList}`);
    let maybeCycleName = result.TextDetections
      .filter((el) => {
        return el.Confidence >= 90
          && el.Type === "WORD"
          && /^[A-Z0]{3}[0-9]{4,5}$/.test(el.DetectedText.replace(/[^A-Z0-9]/g, ""));
      }).map((el) => {
        return el.DetectedText.replace(/[^A-Z0-9]/g, "");
      }).map((detectedTextRaw) => {
        return detectedTextRaw.replace("TY0", "TYO");
      })[0];
    console.log(`result: ${maybeCycleName}`);
    if (maybeCycleName !== undefined) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          maybeCycleName,
        }),
        headers: {
            "Access-Control-Allow-Origin": '*'
        },
        isBase64Encoded: false
      };
    }
    const cycleNamePrefix = result.TextDetections
      .filter((el) => {
        return el.Confidence >= 90
          && el.Type === "WORD"
          && /^[A-Z0]{3}$/.test(el.DetectedText.replace(/[^A-Z0-9]/g, ""));
      }).map((el) => {
        return el.DetectedText;
      }).map((detectedTextRaw) => {
        return detectedTextRaw.replace("TY0", "TYO");
      })[0];
    const cycleNameSuffix = result.TextDetections
      .filter((el) => {
        return el.Confidence >= 90
          && el.Type === "WORD"
          && /^[0-9]{4,5}$/.test(el.DetectedText.replace(/[^A-Z0-9]/g, ""));
      }).map((el) => {
        return el.DetectedText;
      })[0];
    console.log(`cycleNamePrefix: ${cycleNamePrefix}, cycleNameSuffix: ${cycleNameSuffix}`);
    if (cycleNamePrefix && cycleNameSuffix) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          maybeCycleName: cycleNamePrefix + cycleNameSuffix,
        }),
        headers: {
            "Access-Control-Allow-Origin": '*'
        },
        isBase64Encoded: false
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({}),
      headers: {
          "Access-Control-Allow-Origin": '*'
      },
      isBase64Encoded: false
    };
  } catch (error) {
    console.log(error)
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: "error occurred.",
      }),
      headers: {
          "Access-Control-Allow-Origin": '*'
      },
      isBase64Encoded: false
    };
    return response;
  }
  
};
