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

class MCCreateIssue {

  constructor(){
    this._clashIssue = null
  }

  async createClashIssue(pushpindata) {


    $('#forgeviewSpinner').css({ display: "block" }); 
    try {
      var bloburl = await this.getOneSnapshot()
      var blob = await this.getBlobFromUrl(bloburl)
      var screenshot_id = await this.ceateScreenshot(blob)
      var userProfile = await global_oAuth.getForgeUserProfile()
      var userId = userProfile.userId
      var clashes = global_clashRawView._selectedClashes

      var issuedata =
        [
          {
            id: "", 
            title: pushpindata.title,
            status:pushpindata.status,
            description: "This is created by API for Clash", 
            documentLineageUrn: pushpindata.documentLineageUrn,
            documentVersion: 1,  
            dueDate: (new Date()).toISOString(), 
            clashes: clashes,  

            //hard coded  issue type: Coordination-Clash
            //hard coded root cause : Coordination
            issueTypeId: "33c43f8c-47cd-49be-bbee-258416e3edb7",
            issueSubTypeId: "225fed92-54c2-4ad1-808c-f878f4412e39",
            ng_issue_type_id: "33c43f8c-47cd-49be-bbee-258416e3edb7",
            ng_issue_subtype_id: "225fed92-54c2-4ad1-808c-f878f4412e39",
            rootCauseId:"a4ccf064-9ec2-4171-9d55-4dda71dacd67",

            //logged in user as assigner
            assignedTo: userId,
            assignedToType: "User",

            pushpin: {
              type: 'TwoDVectorPushpin',
              location: pushpindata.location,
              objectId:pushpindata.objectId ,
              viewerState:pushpindata.viewerState
            }, 
            screenShots: [
              screenshot_id
            ]
          }
        ]
      var postClashRes = await this.ceateClashIssue(screenshot_id, issuedata) 
      //refresh issue table
      global_mcReadIssue.produceClashIssues(global_msSet.mc_container_id,global_msSet.ms_id,global_msSet.ms_v_id)
      $('#forgeviewSpinner').css({ display: "none" });
      global_Utility.successMessage('Create Clash Issue Succeeded!Check on BIM 360 or refresh clash table in this sample!')
       
    }
    catch (ex) {
      console.log('Create Clash Issue Failed!' + ex)
      global_Utility.successMessage('Create Clash Issue Failed!')
      $('#forgeviewSpinner').css({ display: "none" })
    } 
  }

  async ceateScreenshot(blob) {

    return new Promise(( resolve, reject ) => {

      $.ajax({
        url: '/clashissue/ceateScreenshot/' + global_msSet.mc_container_id + '/' + global_msSet.ms_id,
        type: 'POST',
        processData: false,
        contentType: 'application/octet-stream',
        data: blob,
        success: function (screenshot_id) {  
          resolve(screenshot_id)
        },error: function (error) {  
          reject(error) 
        }
      })  
    }) 
  }

  async ceateClashIssue(screenshot_id, issuedata) {

    return new Promise(( resolve, reject ) => {

      //current test id
      //corresponding to specific model set version
      const testId = global_clashRawView._testJsonObj.filter(function(data){
        return  data.modelSetVersion == global_msSet.ms_v_id
      })

      $.ajax({
        url: '/clashissue/ceateClashIssue',
        type: 'POST',
        processData: false,
        contentType: 'application/json',
        data: JSON.stringify({
          mc_container_id: global_msSet.mc_container_id,
          test_id: testId[0].id,
          screenshot_id: screenshot_id,
          issuedata: issuedata
        }),success: function (data) {  
          resolve(data)
        },error: function (error) {  
          reject(error) 
        }
      }) 
    })

  }
  async getBlobBase64(blob) {

    return new Promise(( resolve, reject ) => {
      var reader = new FileReader();
      reader.onload = function (event) {
        resolve(event.target.result);
      };
      reader.readAsDataURL(blob);
    });
  }
  async getBlobFromUrl(bloburl) {

    return new Promise(( resolve, reject ) => {
      var xhr = new XMLHttpRequest;
      xhr.responseType = 'blob';
      xhr.onload = function () {
        var blob = xhr.response;
        resolve(blob)
      };
      xhr.open('GET', bloburl);
      xhr.send();
    });
  }

  async getOneSnapshot() {
    return new Promise(( resolve, reject ) => {
      global_forgeViewer._viewer.getScreenShot(500, 500,
        bloburl => {
          resolve(bloburl)
        }
      )
    });
  }
}