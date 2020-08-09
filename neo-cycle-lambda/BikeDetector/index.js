const AWS = require('aws-sdk');
var rekognition = new AWS.Rekognition();

exports.handler = async (event) => {
  // TODO implement
  const result = await rekognition.detectText({
    Image: {
      Bytes: Buffer.from(event.imageBase64, 'base64')
    }
  }).promise();
  const cycleName = result.TextDetections
    .filter((el) => {
      return el.Confidence >= 90 && el.Type === "WORD";
    }).map((el) => {
    return el.DetectedText;
    })[0];
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      cycleName,
    }),
    headers: {
        "Access-Control-Allow-Origin": '*'
    },
    isBase64Encoded: false
  };
  return response;
};
