const mongod = require('mongod');
const mongoose = require('mongoose');
const path = require('path');

const port = process.env.DB_PORT;
const url = `mongodb://localhost:${port}/`;
const dbpath = process.env.DB_PATH;

mongoose.Promise = global.Promise;

const mongoDB = new mongod({
  port: port,
  dbpath: path.join(__dirname, '.', dbpath)
});

const followerSchema = new mongoose.Schema({
  login: String
});
const FollowerToProcess = mongoose.model("FollowerToProcess", followerSchema);
const ProcessedFollower = mongoose.model("ProcessedFollower", followerSchema);
const Temporary = mongoose.model("Temporary", followerSchema);

const schemas = {
  FollowerToProcess : FollowerToProcess,
  ProcessedFollower : ProcessedFollower,
  Temporary : Temporary
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
    // I don't know what to do about the connection timeout issue:
    // https://stackoverflow.com/questions/40585705/connection-timeout-for-mongodb-using-mongoose
    // http://mongoosejs.com/docs/connections.html#options
    socketTimeoutMS: 0,
    keepAlive: true,
    reconnectTries: 30
    /* other options */
  }, ()=>{
    console.log('Mongoose: Connected.');
  });
};
const disconnect = () => {
  return mongoose.disconnect(()=>{console.log('Mongoose: Disconnected.')});
};
const save = (Model, dataArray) => {
  return new Promise((resolve, reject)=>{
    Model.create(dataArray, function (err, results) {
      if (err) return reject(err);
      return resolve(dataArray);
    })
  });
};

module.exports = {
  connect,
  disconnect,
  initialize,
  terminate,
  save,
  schemas
};