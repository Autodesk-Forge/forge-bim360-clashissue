/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////


class MCReadIssue {

  constructor(){
    this._clashIssue = null
    this._issueTable = null
  }

  async initClashIssueHeader(){
    var cols = [
      { data: '0',title:"Title",orderable:false},
      { data: '1',title:"Description",orderable:false},
      { data: '2',title:"Assignees",orderable:false},
      { data: '3',title:"Due Date",orderable:false},
      { data: '4',title:"Root Cause",orderable:false},
      { data: '5',title:"Issue Type",orderable:false},
      { data: '6',title:"Status",orderable:false},
      { data: '7',title:"Clash Groups",orderable:false}  
    ]
    this._issueTable = $('#tableIssueView').DataTable( {
      columns: cols,searching: false, paging: false, info: false,scrollY:"40vh",
      scrollCollapse: true
     } );   
  }

  async reset(){
     //reset
     if(this._issueTable) 
       this._issueTable.rows().clear().draw()
      this._clashIssue = null 
  }
  async produceClashIssues(mc_container_id,ms_id,ms_v_id){
 
    try{
      $('#clashissueSpinner').css({ display: "block" }) 

      const jobId = await this.startIssuesJob(mc_container_id,ms_id,ms_v_id)

      var status = 'running' 
      const st = new Date().getTime() 
      while(status == 'running' 
           && !global_Utility.checkTimeout(st,new Date().getTime()))
          status = await this.getIssueJobStatus(jobId) 
      
      if(status == 'failed'){
        global_Utility.failMessage('Get Clash Issue Failed!!')  
        return
      } 
      if(status == 'running'){
        global_Utility.failMessage('Get Clash Issue Timeout!!')  
        return
      }   
      this._clashIssue= await this.getClashIssue(mc_container_id,ms_id,ms_v_id) 
 

      var rows =[] 
      for (var index in this._clashIssue) {
        var eachItem = this._clashIssue[index]; 

        const row={'0':eachItem.title?eachItem.title:'null',
                 '1':eachItem.description?eachItem.description:'null',
                 '2':eachItem.assigned_to?eachItem.assigned_to:'null',
                 '3':eachItem.due_date?eachItem.due_date:'null',
                 '4':eachItem.rootcause?eachItem.rootcause:'null',
                 '5':eachItem.issuetype?eachItem.issuetype:'null',
                 '6':eachItem.status?eachItem.status:'null',
                 '7':eachItem.clashgroups.toString()?eachItem.clashgroups.toString():'null'}
        rows.push(row) 
      } 

      this._issueTable.rows.add(rows).draw( false );   

      global_Utility.successMessage('Get Clash Issue Succeeded!!')  
      $('#clashissueSpinner').css({ display: "none" })

      return true 
    }catch(ex){
      console.log('Get Clash Issue Failed!! ' + ex )  
      global_Utility.failMessage('Get Clash Issue Failed!!')  
      $('#clashissueSpinner').css({ display: "none" })

      return false
    } 
  }

  async startIssuesJob(mc_container_id,ms_id,ms_v_id){
    
    return new Promise(( resolve, reject ) => {  
      $.ajax({
        url: '/clashissue/startIssuesJob/'+mc_container_id + '/' + ms_id+'/'+ms_v_id,
        contentType: 'application/json',
        type: 'GET', 
        success: function (res) {   
          resolve(res.jobId)
        },
        error: function (error) { 
          reject(error);
        }
      });
    });
  }  

  async getIssueJobStatus(jobId){
      return new Promise(( resolve, reject ) => {
          $.ajax({
              url: '/clashissue/getIssueJobStatus/'+jobId,
              type: 'GET' ,
                success: function (data) {  
                  resolve(data.status)
                },error: function (error) {  
                  reject(error) 
              } 
          }); 
      }) 
  } 

  async getClashIssue(mc_container_id,ms_id,ms_v_id){
    return new Promise(( resolve, reject ) => {
        $.ajax({
            url: '/clashissue/getIssues/' +mc_container_id + '/' + ms_id+'/'+ms_v_id,
            type: 'GET' ,
              success: function (data) {  
                resolve(data)
              },error: function (error) {  
                reject(error) 
            } 
        }); 
    }) 
  }  
  
}


 