const mongod = require('mongod');
const mongoose = require('mongoose');
const path = require('path');

const port = 27017;
const url = `mongodb://localhost:${port}/`;

mongoose.Promise = global.Promise;

const mongoDB = new mongod({
  port: port,
  dbpath: path.join(__dirname, '.', 'mongodb', 'data')
});

const videoSchema = new mongoose.Schema({
  title: String,
  url: String,
  aliasUrl: String,
  number: Number,
  season: Number,
  episode: Number,
  description: String,
  video: String,
  trailer: String,
  imageThumb: String
});
const Video = mongoose.model("Video", videoSchema);

const followerSchema = new mongoose.Schema({
  login: String
});
const FollowerToProcess = mongoose.model("FollowerToProcess", followerSchema);
const ProcessedFollower = mongoose.model("ProcessedFollower", followerSchema);

const schemas = {
  Video : Video,
  FollowerToProcess : FollowerToProcess,
  ProcessedFollower : ProcessedFollower
};

const initialize = () => {
  return mongoDB.open()
    .then(() => {
      console.log('MongoDB: Opened.');
    })
};
const terminate = () => {
  return mongoDB.close()
    .then(()=>{
      console.log('MongoDB: Closed.');
    })
};
const connect = (database) => {
  return mongoose.connect(url + database, {
    useMongoClient: true,
    /* other options */
  }, ()=>{
    console.log('Mongoose: Connected.');
  });
};
const disconnect = () => {
  return mongoose.disconnect(()=>{console.log('Mongoose: Disconnected.')});
};
const save = (Model, dataArray) => {
	//console.log(dataArray);
  return new Promise((resolve, reject)=>{
    Model.create(dataArray, function (err, results) {
      if (err) return reject(err);
      //console.log('Mongoose: Save successful!');

      // saved!
      resolve();
    })
  });

  // return Model.insertMany(dataArray).then((docs) => {
  //   console.log('SAVED!');
  //   console.log(docs);
  // })

/*

 https://www.google.com/search?q=how+to+backup+mongodb&rlz=1C1GGRV_enUS751US751&oq=how+to+backup+mongo&aqs=chrome.0.0j69i57j0l4.4128j0j7&sourceid=chrome&ie=UTF-8
 https://docs.mongodb.com/manual/core/backups/
 https://docs.mongodb.com/manual/tutorial/backup-and-restore-tools/


 */
};


module.exports = {
  connect,
  disconnect,
  initialize,
  terminate,
  save,
  schemas
};