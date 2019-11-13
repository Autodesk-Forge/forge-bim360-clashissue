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

var global_oAuth = new oAuth()
var global_dmProjects = new DMProjects() 
var global_msSet = new MSSet()
var global_clashRawView= new ClashRawView()
var global_forgeViewer= new ForgeViewer()
var global_Utility = new Utility()
var global_mcReadIssue =  new MCReadIssue()
var global_mcCreateIssue =  new MCCreateIssue() 


$(document).ready(function () {  
    global_clashRawView.initClashRawHeader()
    global_mcReadIssue.initClashIssueHeader()

    $('#iconlogin').click(global_oAuth.forgeSignIn);

    var currentToken = global_oAuth.getForgeToken(); 

    if (currentToken === '')
      $('#signInButton').click(global_oAuth.forgeSignIn);

    else {
      global_oAuth.getForgeUserProfile().then((profile)=> {
        $('#signInProfileImage').removeClass();  
        $('#signInProfileImage').html('<img src="' + profile.picture + '"/>')
        $('#signInButtonText').text(profile.name);
        $('#signInButtonText').attr('title', 'Click to Sign Out');
        $('#signInButton').click(global_oAuth.forgeLogoff);
      })
    } 
 
    if (global_oAuth.getForgeToken() != '') {
      global_dmProjects.refreshBIMHubs();  
    } 
    

    $("#refreshHubs").click(function () {
      global_dmProjects.refreshBIMHubs(); 
    });  
    $('#aboutHelp').click(function(evt){
      if(document.getElementsByName('aboutHelpDialog').length>0)
           $('#aboutHelpDialog').modal('show');
      else
        createHelpAndShow('aboutHelp');
     });

    $('#configHelp').click(function(evt){
      if(document.getElementsByName('configHelpDialog').length>0)
           $('#configHelpDialog').modal('show');
      else
        createHelpAndShow('configHelp');
     });

     $('#basicHelp').click(function(evt){
      if(document.getElementsByName('basicHelpDialog').length>0)
           $('#basicHelpDialog').modal('show');
      else
        createHelpAndShow('basicHelp');
     });

     $('#exportHelp').click(function(evt){
      if(document.getElementsByName('exportHelpDialog').length>0)
           $('#exportHelpDialog').modal('show');
      else
        createHelpAndShow('exportHelp');
     });

     $('#dashboardHelp').click(function(evt){
      if(document.getElementsByName('dashboardHelpDialog').length>0)
           $('#dashboardHelpDialog').modal('show');
      else
        createHelpAndShow('dashboardHelp');
     });

     $('#integrationHelp').click(function(evt){
      if(document.getElementsByName('integrationHelpDialog')>0)
           $('#integrationHelpDialog').modal('show');
      else
        createHelpAndShow('integrationHelp');
     }); 

     delegateProjectSelectedEvent()
     delegateModelsetSelectedEvent()
     delegateIssueViewSelectedEvent() 
      //delegate the event when one table item is selected
      delegateRawTableSelection() 

});

function createHelpAndShow(helpName){

  $.ajax({
    url: 'helpDiv/'+helpName+'.html',
    success: function(data) {
        var tempDiv = document.createElement('div'); 
        tempDiv.innerHTML = data;
        document.body.appendChild(tempDiv);

        if(helpName == 'configHelp'){
          $.getJSON("/api/forge/clientID", function (res) {
            $("#ClientID").val(res.ForgeClientId);
            $('#'+helpName+'Dialog').modal('show');  
          }); 
          $("#provisionAccountSave").click(function () {
            $('#configHelpDialog').modal('toggle');
          });
        }else
          $('#'+helpName+'Dialog').modal('show');  
    }
  } );
}

//delegate the event of project selecting
function delegateProjectSelectedEvent(){

  $(document).on('click', '#hubs_list .list-group .list-group-item', function(e) {  
    var $this = $(this);

    //switch the selected status of the item
    $('#hubs_list .list-group-item.active').removeClass('active');
    $this.toggleClass('active') 
  
    //get hub id of the project
    var hub_id = $this.attr('data');//it is also project id without 'b.'
    hub_id = 'b.'+hub_id
    //get model coordination container id
    var mc_container_id = $this.attr('id');//it is also project id without 'b.'
    var project_id = 'b.'+ mc_container_id;
    (async(mc_container_id)=>{ 
      //start to refresh model set collection
      $('#msSpinner').css({ display: "block" });  
      //in order to get some basic info of a project such as Issue container ID
      //the iteration for each project on server might probably have not completed.
      //so Issue container ID maybe missing at this moment.
      await global_dmProjects.refreshProjectInfo(hub_id,project_id)
      //refresh data of model set in this project
      await global_msSet.refreshModelSets(mc_container_id)   
      $('#msSpinner').css({ display: "none" });  
    })(mc_container_id)  
  })  
} 

//when a modelset is selected
function delegateModelsetSelectedEvent(){

  $(document).on('click', '#modelsetList .list-group-item', function(e) {  
    var $this = $(this);

    //switch the selected status of the item
    $('#modelsetList .list-group-item.active').removeClass('active');
    $this.toggleClass('active') 

    //get related ids
    var ms_id = $this.attr('id') 
    var mc_container_id = $('#hubs_list .list-group .list-group-item.active').attr('id')
    var ms_v_id = $this.attr('tipVersion'); 

    (async(mc_container_id,ms_id,ms_v_id)=>{

      global_msSet.mc_container_id = mc_container_id
      global_msSet.ms_id = ms_id
      global_msSet.ms_v_id = ms_v_id

      $('#clashviewSpinner').css({ display: "block" })
      $('#clashissueSpinner').css({ display: "block" })
      global_clashRawView.reset()
      global_mcReadIssue.reset()

      let r = await global_msSet.refreshOneModelset(mc_container_id,ms_id,ms_v_id)
      if(r)
        global_forgeViewer.launchViewer(global_msSet._docsMap)   
      if(r)
        r=await global_clashRawView.produceClashRawTable(mc_container_id,ms_id,ms_v_id)
      if(r)
        r= await global_mcReadIssue.produceClashIssues(mc_container_id,ms_id,ms_v_id)  
      $('#clashviewSpinner').css({ display: "none" })
      $('#clashissueSpinner').css({ display: "none" })

      })(mc_container_id,ms_id,ms_v_id)
  }) 
}
 
 

function delegateIssueViewSelectedEvent(){
  $(document).on('click', '#tableIssueView tbody tr', function(e) {

    if(!global_forgeViewer){
      global_Utility.failMessage('Forge Viewer is not loaded!')
      return
    }

    var $this = $(this);
    $('.table-active').removeClass('table-active');
    $this.toggleClass('table-active') 
  
    const data = global_mcReadIssue._issueTable.row( this ).data();  

    var v = data['7']
    var clashIds = v.split(',') 
    global_forgeViewer.isolateClash(clashIds)    
  }) 
} 
  

function delegateRawTableSelection(){
  $(document).on('click', '#clashRawTable tbody tr', function(e) {

    if(!global_forgeViewer){
      global_Utility.failMessage('Forge Viewer is not loaded!')
      return
    }

    $('#clashRawTable .table-success').removeClass('table-success');
    $(this).toggleClass('table-success') 

    const data = global_clashRawView._clashtable.row( this ).data();  
    const clashId = data['0']
    //single clash in this sample 
    global_forgeViewer.isolateClash([clashId])
    global_clashRawView._selectedClashes = [clashId]
  })  
}