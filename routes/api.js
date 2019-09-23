/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
const MongoClient = require("mongodb").MongoClient,
      ObjectId = require('mongodb').ObjectID,
      url = process.env.MONGO_URI,
      flagObj = {
        useNewUrlParser: true,
        useUnifiedTopology: true
      },
      database = "cluster0-uzznx"
;

const stampToJSON = (timeStamp) => new Date(timeStamp).toJSON();

// return true if the given id is a valid mongoDB ObjectId:
const validateObjectId = id => {
  return /^[a-f0-9]{24}$/i.test(id);
};

const checkId = id => {
  if (!(id)) return `_id error`;
  if (!(validateObjectId(id))) return `Incorrect id format.`;
};

module.exports = function (app) {
  app.route('/api/issues/:project')
    
    .get(function (req, response){
      var project = req.params.project;
      console.log(req.query);
      const id = req.query._id;
      if (id) {
        const error = checkId(id);
        if (error) return response.send(error);
        req.query._id = new ObjectId(id);
      }
      MongoClient.connect(url, flagObj, (error, db) => {
        if (error) throw error;
        const dbo = db.db(database);
        dbo.collection(project).find(req.query).toArray((error, result) => {
          if (error) throw error;
          response.json(result);
          db.close();
        });
      });
      
      
    })
    
    .post(function (req, response){
      var project = req.params.project;
      let error = "";
      if (!(req.body.issue_title)) error += " Title required. ";
      if (!(req.body.issue_text)) error += " Text required. ";
      if (!(req.body.created_by)) error += " Created by required. ";
      if (error) return response.send(`Missing input: ${error}`);
      const issue = {
        issue_title: req.body.issue_title.trim(),
        issue_text: req.body.issue_text.trim(),
        created_by: req.body.created_by.trim(),
        assigned_to: req.body.assigned_to.trim(),
        status_text: req.body.status_text.trim(),
        created_on: Date.now(), // timestamp
        updated_on: Date.now(),
        open: "true"
      };
      MongoClient.connect(url, flagObj, (error, db) => {
        if (error) throw error;
        const dbo = db.db(database);
        dbo.collection(project).insertOne(issue, (error, result) => {
          if (error) throw error;
          issue._id = result.insertedId;
          issue.created_on = stampToJSON(issue.created_on);
          issue.updated_on = stampToJSON(issue.updated_on);
          response.json(issue);
          db.close();
        });
      });
    })
    
    .put(function (req, response){
      const project = req.params.project;
      const updateIssue = req.body;
      const error = checkId(updateIssue._id);
      if (error) return response.send(error);
      const id = new ObjectId(updateIssue._id);
      delete updateIssue._id;
      for (const key in updateIssue) {
        if (!(updateIssue[key])) delete updateIssue[key];
      }
      if (Object.keys(updateIssue).length === 0) return response.send("no updated field sent");
      updateIssue.updated_on = Date.now();
    
      MongoClient.connect(url, flagObj, (error, db) => {
        if (error) throw error;
        const dbo = db.db(database);
        const modifyObj = [
          { // filter obj for select document
            _id: id,
            open: "true"        
          },
          { // update the fields in the selected document
            $set: updateIssue
          }
        ];
        dbo.collection(project).findOneAndUpdate(...modifyObj, (error, result) => {
          if (error) return response.send(`could not update ${id} ${error}`);
          if (result.lastErrorObject.updatedExisting) {
            return response.send(`successfully updated`);
          }
          return response.send(
            `could not update: invalid id: ${id} or this issue already closed `
          );
        });
        db.close();
      });
    })
    
    .delete(function (req, response){
      var project = req.params.project;
      const error = checkId(req.body._id);
      if (error) return response.send(error);
      const id = new ObjectId(req.body._id);
      MongoClient.connect(url, flagObj, (error, db) => {
        if (error) throw error;
        const dbo = db.db(database);
        const queryObj = {
          _id: id
        };
        dbo.collection(project).deleteOne(queryObj, (error, result) => {
          if (error) return response.send(`could not delete ${id}`);
          response.send(`deleted ${id}`);
        });
        db.close();
      });
    });
};
