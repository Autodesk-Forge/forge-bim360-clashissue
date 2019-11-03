
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


// *******************************************
// BIM 360 Issue Extension
// *******************************************
function ClashIssueExt(viewer, options) {
  Autodesk.Viewing.Extension.call(this, viewer, options);
  this.viewer = viewer;
  this.panel = null;  
  this.pushPinExtensionName = 'Autodesk.BIM360.Extension.PushPin';

}

ClashIssueExt.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
ClashIssueExt.prototype.constructor = ClashIssueExt;

ClashIssueExt.prototype.load = function () {
  if (this.viewer.toolbar) {
    // Toolbar is already available, create the UI
    this.createUI();
  } else {
    // Toolbar hasn't been created yet, wait until we get notification of its creation
    this.onToolbarCreatedBinded = this.onToolbarCreated.bind(this);
    this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
  }
  return true;
};

ClashIssueExt.prototype.onToolbarCreated = function () {
  this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
  this.onToolbarCreatedBinded = null;
  this.createUI();
};

ClashIssueExt.prototype.createUI = function () {
  var _this = this;

  // SubToolbar
  this.subToolbar = (this.viewer.toolbar.getControl("MyAppToolbar") ?
    this.viewer.toolbar.getControl("MyAppToolbar") :
    new Autodesk.Viewing.UI.ControlGroup('MyAppToolbar'));
  this.viewer.toolbar.addControl(this.subToolbar);

  // load/render issues button
  {
    var loadQualityIssues = new Autodesk.Viewing.UI.Button('loadQualityIssues');
    loadQualityIssues.onClick = function (e) {
      // check if the panel is created or not
      if (_this.panel == null) {
        _this.panel = new BIM360IssuePanel(_this.viewer, _this.viewer.container, 'bim360IssuePanel', 'BIM 360 Issues');
      }
      // show/hide docking panel
      _this.panel.setVisible(!_this.panel.isVisible());

      // if panel is NOT visible, exit the function
      if (!_this.panel.isVisible()) return;

      // ok, it's visible, let's load the issues
      _this.loadIssues();
    };
    loadQualityIssues.addClass('loadQualityIssues');
    loadQualityIssues.setToolTip('Show Issues');
    this.subToolbar.addControl(loadQualityIssues);
  }

  // create quality issue
  {
    var createQualityIssues = new Autodesk.Viewing.UI.Button('createQualityIssues');

    //append spinner element 
    const oneDiv = document.createElement('div')
    oneDiv.classList.add('fa-middle-forgeview')
    const fa = document.createElement('i')
    fa.setAttribute('id','forgeviewSpinner')
    fa.classList.add('fa')
    fa.classList.add('fa-spinner')
    fa.classList.add('fa-spin')
    fa.style.display = 'none'
    oneDiv.append(fa)
    createQualityIssues.container.childNodes[0].append(oneDiv) 
    
    createQualityIssues.onClick = function (e) {
      var pushPinExtension = _this.viewer.getExtension(_this.pushPinExtensionName);
      if (pushPinExtension == null) {
        var extensionOptions = {
          //hideRfisButton: true,
          //hideFieldIssuesButton: true,
        };
        _this.viewer.loadExtension(_this.pushPinExtensionName, extensionOptions).then(function () { _this.createIssue(); });
      }
      else
        _this.createIssue(); // show issues
    };
    createQualityIssues.addClass('createQualityIssues');
    createQualityIssues.setToolTip('Create Issues');
    this.subToolbar.addControl(createQualityIssues);
  }
};

ClashIssueExt.prototype.createIssue = function () {

  if(!global_clashRawView._selectedClashes){
    alert('select clashes in Raw View firstly!')
    return
  }
  var _this = this;
  var pushPinExtension = _this.viewer.getExtension(_this.pushPinExtensionName);


  var issueLabel = prompt("Enter issue label: ");
  if (issueLabel === null) return;

  // prepare to end creation...
  pushPinExtension.pushPinManager.addEventListener('pushpin.created', function (e) {

    pushPinExtension.pushPinManager.removeEventListener('pushpin.created', arguments.callee);
    pushPinExtension.endCreateItem();

    var issue = pushPinExtension.getItemById(pushPinExtension.pushPinManager.pushPinList[0].itemData.id);
    if (issue === null) {
      alert('no issue is created! please select again!') 
      return
    } 

    if(issue.objectData == null || issue.objectData == undefined 
       || issue.objectData.urn == null ||  issue.objectData.urn == undefined){ 
        //remove the newly added pushpin icon
        var itemId = pushPinExtension.pushPinManager.pushPinList[0].itemData.id
        pushPinExtension.removeItemById(itemId)
        alert('no object is selected! please select again!') 
        return
    } 
    //get selected object of Forge Viewer
    const selectedUrn = issue.objectData.urn 
    console.log('selected object urn:' + selectedUrn)
    const docsMap = global_msSet._docsMap
    let filter = docsMap.filter(function (data) {
      return data.urn == 'urn:' + selectedUrn
    }) 
    const documentLineageUrn = filter[0].lineageUrn
    console.log('selected object location:' + issue.position)

    //if it is not from the first model, tune the position
    var loadedModels = global_forgeViewer._viewer.impl.modelQueue().getModels()
    var isFirstModelIssue = selectedUrn == loadedModels[0].myData.urn
     //if(!isFirstModelIssue)
     {
       issue.position.x += loadedModels[0].myData.globalOffset.x
       issue.position.y += loadedModels[0].myData.globalOffset.y 
       issue.position.z += loadedModels[0].myData.globalOffset.z
     }
     issue.viewerState.seedURN = selectedUrn
     issue.viewerState.globalOffset = {x:0,y:0,z:0}

    var data = { 
        title: issue.label, 
        status: issue.status.split('-')[1] || issue.status,  
        objectId: issue.objectId,  
        location: issue.position,  
        viewerState: issue.viewerState,
        documentLineageUrn:  documentLineageUrn 
    };
    //create screenshot
    global_mcCreateIssue.createClashIssue(data)
  }); 


  // start asking for the push location
  pushPinExtension.startCreateItem({ label: issueLabel, status: 'open', type: 'issues' });
}


ClashIssueExt.prototype.unload = function () {
  this.viewer.toolbar.removeControl(this.subToolbar);
  return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension('ClashIssueExt', ClashIssueExt);


// *******************************************
// BIM 360 Issue Panel
// *******************************************
function BIM360IssuePanel(viewer, container, id, title, options) {
  this.viewer = viewer;
  Autodesk.Viewing.UI.PropertyPanel.call(this, container, id, title, options);
}
BIM360IssuePanel.prototype = Object.create(Autodesk.Viewing.UI.PropertyPanel.prototype);
BIM360IssuePanel.prototype.constructor = BIM360IssuePanel;

// *******************************************
// Issue specific features
// *******************************************
ClashIssueExt.prototype.loadIssues = function (containerId, urn) {

  //get clash issue only. 
  var _this = this;
  _this.getIssues();
}

ClashIssueExt.prototype.getContainerId = function (href, urn, cb) {
  var _this = this;
  if (_this.panel) {
    _this.panel.removeAllProperties();
    _this.panel.addProperty('Loading...', '');
  }
  $.ajax({
    url: '/api/forge/bim360/container?href=' + href,
    success: function (res) {
      _this.containerId = res.containerId;
      _this.hubId = res.hubId;
      cb();
    }
  });
}

ClashIssueExt.prototype.getIssues = function () {
  var _this = this;

  _this.issues = global_mcReadIssue._clashIssue

  // do we have issues on this document?
  var pushPinExtension = _this.viewer.getExtension(_this.pushPinExtensionName);
  if (_this.panel) _this.panel.removeAllProperties();
  if (pushPinExtension == null) {
    var extensionOptions = {
      hideRfisButton: true,
      hideIssuesButton: true,
    };
    _this.viewer.loadExtension(_this.pushPinExtensionName,
      extensionOptions).then(function () {
        _this.showIssues();
      }); // show issues (after load extension)
  } else {
    _this.showIssues(); // show issues
  }

}

ClashIssueExt.prototype.showIssues = function () {
  var _this = this;

  //remove the list of last time
  var pushPinExtension = _this.viewer.getExtension(_this.pushPinExtensionName);
  pushPinExtension.removeAllItems();
  pushPinExtension.showAll();

  var pushpinDataArray = [];
  var loadedModels = global_forgeViewer._viewer.impl.modelQueue().getModels()
  _this.issues.forEach(function (issue) {

    //check if the model of this issue has been loaded in  Forge Viewer
    //if not, skip this issue
    let filter = loadedModels.filter(function(data){
      return  (issue.pushpin.viewer_state) && data.myData.urn == issue.pushpin.viewer_state.seedURN
    })
    if(filter && filter.length > 0){  
      //will adjust the offset of the issue location 
      var isFirstModelIssue = issue.pushpin.viewer_state.seedURN == loadedModels[0].myData.urn

      var duedate = moment(issue.due_date);

      // show issue on panel
      if (_this.panel) {
        _this.panel.addProperty('Title', issue.title, 'Issue ' + issue.id);
        _this.panel.addProperty('Due at', duedate.format('MMMM Do YYYY, h:mm a'), 'Issue ' + issue.id);
        _this.panel.addProperty('Assigned to', issue.assigned_to, 'Issue ' + issue.id);
      }

      // add the pushpin
      var issueAttributes = issue.attributes;
      var pushpinAttributes = issue.pushpin;
      if (pushpinAttributes) {
        issue.type = issue.type.replace('quality_', ''); // temp fix during issues > quality_issues migration

        //if(!isFirstModelIssue)
        {
          pushpinAttributes.location.x -= loadedModels[0].myData.globalOffset.x
          pushpinAttributes.location.y -= loadedModels[0].myData.globalOffset.y 
          pushpinAttributes.location.z -= loadedModels[0].myData.globalOffset.z
        }
        pushpinDataArray.push({
          id: issue.id,
          label: issue.title,
          status: issue.type && issue.status.indexOf(issue.type) === -1
            ? `${issue.type}-${issue.status}` : issue.status,
          position: pushpinAttributes.location,
          type: issue.type,
          objectId: pushpinAttributes.object_id,
          viewerState: pushpinAttributes.viewer_state
        });
      }
    }
  }) 
  pushPinExtension.loadItems(pushpinDataArray);  
}


