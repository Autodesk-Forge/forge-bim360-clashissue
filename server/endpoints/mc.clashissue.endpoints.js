
const express = require('express'); 
const router = express.Router(); 

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json(); 
const _ = require('lodash'); 
const url = require('url');   

const UserSession = require('../services/userSession');
const mcClashServices = require('../services/mc.clash.services');
const issueServices = require('../services/issues.services');

var bimDatabase = require('../bim.database')

const utility = require('../utility');
 
router.get('/clashissue/startIssuesJob/:mc_container_id/:ms_id/:ms_v_id',jsonParser, async (req, res, next) => {
  
  try {
    const userSession = new UserSession(req.session);
    if (!userSession.isAuthorized()) {
      res.status(401).end('Please login first');
      return; 
    }  
    const mc_container_id = req.params['mc_container_id'] 
    const ms_id = req.params['ms_id']
    const ms_v_id = req.params['ms_v_id']  

    //model coordination container id is just project id...
    //try to find the issue container id from project id
    const issueContainerId = bimDatabase.getBIMDatabase().IssueContainerIds['b.'+ mc_container_id]
    if(!issueContainerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
     }  

     var jobId = require('../utility').randomValueBase64(6);  
     utility.storeStatus(jobId,'running') 
     res.status(200).json({jobId:jobId});  

    //get assigned clash   

    var input = {
          credentials:userSession.getUserServerCredentials(),  
          jobId:jobId,
          issueContainerId:issueContainerId,
          mc_container_id:mc_container_id,  
          ms_id:ms_id,
          ms_v_id,ms_v_id
    };   
    
    const clashAssignedIssues = await mcClashServices.getMSAssignedClash(input) 
    const issues_raw_data = await getIssueCommonInfo(input,clashAssignedIssues) 
    const clash_issue_json = refineIssues(mc_container_id,issues_raw_data)  
    //store to database in case of need
    bimDatabase.refreshClashIssues(mc_container_id+ms_id+ms_v_id,clash_issue_json) 

    utility.storeStatus(jobId, 'succeeded')

  }
  catch(e) {
    // here goes out error handler
    console.log(e) 
    res.status(500).end()
  }   
}); 

async function getIssueCommonInfo(input,clashAssignedIssues){

    var issues_raw_data = []   
    await Promise.all(clashAssignedIssues.map(async (eachAssignedIssue) => {
        input.issueId = eachAssignedIssue.issueId 
        let issueData = await issueServices.getOneIssue(input)  
        issueData.clashes = eachAssignedIssue.clashes 
        issues_raw_data.push(issueData)     
      })) 
     return (issues_raw_data) 
}

router.get('/clashissue/getIssueJobStatus/:jobId', async (req, res, next) => {

  try {   
    const jobId = req.params['jobId'] 
    const status = utility.readStatus(jobId)

    if(status == 'succeeded')
      // now delete this status file
      utility.deleteStatus(jobId)

    if(status) 
      res.status(200).json({status:status});  
    else 
      res.status(500).json({status:'failed'});
   } catch(e) {
      res.status(500).end('getIssueJobStatus failed!')
  }  
})  
 
 router.get('/clashissue/getIssues/:mc_container_id/:ms_id/:ms_v_id',jsonParser, async (req, res, next) => {

  try{
    const mc_container_id = req.params['mc_container_id']  
    const ms_id = req.params['ms_id']
    const ms_v_id = req.params['ms_v_id']  

    //should we also deflate the issue data?
    const clash_issue_json = bimDatabase.getBIMDatabase().ClashIssues[mc_container_id+ms_id+ms_v_id]
    res.json(clash_issue_json)
  }
  catch(e) {
    // here goes out error handler
    res.status(500).end()
  } 
});   
 
router.post('/clashissue/ceateScreenshot/:mc_container_id/:ms_id', async (req, res, next) => {

    try{
    var userSession = new UserSession(req.session);
    if (!userSession.isAuthorized()) {
      res.status(401).end('Please login first');
      return; 
    }  

    var mc_container_id = req.params['mc_container_id']
    var ms_id = req.params['ms_id'] 

    var input = {
      credentials:userSession.getUserServerCredentials(),  
      mc_container_id:mc_container_id,  
      ms_id:ms_id,
      filebody:req.body
    };  

    var screenshotId = await mcClashServices.createScreenshot(input)  
    res.json(screenshotId)  
 }
 catch(e) {
  // here goes out error handler
  console.log(e)
  res.status(500).end()
} 

})

//field issue
router.post('/clashissue/ceateClashIssue', jsonParser,async (req, res, next) => {

  try{
 
    var userSession = new UserSession(req.session);
    if (!userSession.isAuthorized()) {
      res.status(401).end('Please login first');
      return; 
    }  

    var mc_container_id = req.body.mc_container_id
    var test_id = req.body.test_id
    var screenshot_id = req.body.screenshot_id 
    
    var issuedata = req.body.issuedata 
    issuedata.screenShots = [screenshot_id]
    var input = {
      credentials:userSession.getUserServerCredentials(),  
      mc_container_id:mc_container_id, 
      test_id:test_id, 
      issuedata:issuedata
    };  

    var jobId = await mcClashServices.createClashIssue(input) 
    input.jobId = jobId
    var status = 'Running'

    //will add timeout
    while(status == 'Running'){
      status = await mcClashServices.getJobStatus(input) 
    } 
    res.json(status) 

  }
  catch(e) {
    // here goes out error handler
    res.status(500).end()
  } 
}); 

function refineIssues(mc_container_id,issues_raw_data){ 

  const bb = bimDatabase.getBIMDatabase()
  const projectId = 'b.'+mc_container_id
  const hubId = bb.ProjectToHubMap[projectId ]

  var clash_issue_refine_json = []
  let assign_to_name,issue_type_name,root_cause_name
  issues_raw_data.forEach(function(eachIssue) {  

   
    const ng_issue_type_id = eachIssue.attributes.ng_issue_type_id 
    let filter = bb.IssueTypes[projectId].filter(function(data){
      return data.id == ng_issue_type_id
    })
    if(filter && filter.length>0)
        issue_type_name = filter[0].title

    const ng_issue_subtype_id = eachIssue.attributes.ng_issue_subtype_id   


    const root_cause_id = eachIssue.attributes.root_cause
    filter = bb.RootCauses[projectId].filter(function(data){
      return data.id == root_cause_id
    })
    if(filter && filter.length>0)
        root_cause_name = filter[0].title

    const assigned_to_type = eachIssue.attributes.assigned_to_type
    const assigned_to = eachIssue.attributes.assigned_to
    
    if(assigned_to_type == 'user'){
      filter = bb.HubUserList[hubId].filter(function(data){
        return data.uid == assigned_to
      })
      filter && filter.length>0? assign_to_name = filter[0].name :assign_to_name='null' 
    }else if(assigned_to_type == 'company') {
      filter = bb.HubCompanyList[hubId].filter(function(data){
        return data.id == assigned_to
      })
      filter && filter.length>0? assign_to_name = filter[0].name :assign_to_name='null' 
    }else if(assigned_to_type == 'role'){
       //to do
       assign_to_name = 'role'
    }else
      assign_to_name='null' 

      clash_issue_refine_json.push(
      {
        id:eachIssue.id,
        title:eachIssue.attributes.title,
        description:eachIssue.attributes.description, 
        clashgroups:eachIssue.clashes,
        status:eachIssue.attributes.status, 
        pushpin:eachIssue.attributes.pushpin_attributes,
        type:eachIssue.type,
        created_at:eachIssue.attributes.created_at, 
        due_date:eachIssue.attributes.due_date,  
        company:'', 
        assigned_to:  assign_to_name,  
        issuetype:issue_type_name,
        rootcause:root_cause_name
       }) 
    }); 

    return clash_issue_refine_json 
}
 
module.exports = router