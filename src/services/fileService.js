import axios from 'axios';
import config from 'config';
import util from '../util';

const getDownloadUrl = async (bucket, key) => {
  const token = await util.getM2MToken();
  const { data } = await axios.post(
    `${config.get('fileServiceEndpoint')}/downloadurl`,
    { bucket, key },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data.url;
};

const getUploadUrl = async (bucket, key) => {
  const token = await util.getM2MToken();
  const { data } = await axios.post(
    `${config.get('fileServiceEndpoint')}/uploadurl`,
    { bucket, key },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data.url;
};

const deleteFile = async (bucket, key) => {
  const token = await util.getM2MToken();
  await axios.post(
    `${config.get('fileServiceEndpoint')}/deletefile`,
    { bucket, key },
    { headers: { Authorization: `Bearer ${token}` } },
  );
};

module.exports = {
  getDownloadUrl,
  getUploadUrl,
  deleteFile,
};
