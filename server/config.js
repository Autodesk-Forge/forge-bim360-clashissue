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

'use strict'; 

module.exports = {

  // set environment variables or hard-code here
  credentials: {
    client_id: process.env.FORGE_CLIENT_ID || '<Your Forge Client ID>',
    client_secret: process.env.FORGE_CLIENT_SECRET || 'Your Forge Client Secret'
  },
  //ensure the callback url is same to what has been registered with the Forge app
  callbackURL: process.env.FORGE_CALLBACK_URL || 'http://localhost:3000/api/forge/callback/oauth',   

  // Required scopes for your application on server-side
  scopeInternal: ['account:read','bucket:create', 'bucket:read', 'data:read', 'data:create', 'data:write'],
  // Required scope of the token sent to the client
  scopePublic: ['viewables:read'], 

  hqv1: {
    basedUrl: 'https://developer.api.autodesk.com',
    httpHeaders: function (access_token) {
      return {
        Authorization: 'Bearer ' + access_token,
        'Content-Type': 'application/json'
      }
    },
    getUserProfileAtMe:function(){
      return this.basedUrl+ '/userprofile/v1/users/@me'
    }
   },

  //Issue API v1
  issuev1: { 

    basedUrl: 'https://developer.api.autodesk.com/issues/v1/containers/',
    httpHeaders: function (access_token) {
      return {
        Authorization: 'Bearer ' + access_token,
        'Content-Type': 'application/vnd.api+json'
      }
    },
    getIssues: function (containerId, filter = '') {
      return this.basedUrl + containerId + '/quality-issues' + filter;
    },
    getComments: function (containerId, issueId) {
      return this.basedUrl + containerId + '/quality-issues/' + issueId + '/comments';
    },
    getAttachments: function (containerId, issueId) {
      return this.basedUrl + containerId + '/quality-issues/' + issueId + '/attachments'
    },
    getOneIssue: function (containerId, issueId) {
      return this.basedUrl + containerId + '/quality-issues/' + issueId;
    },
    createComments: function(containerId) {
      return this.basedUrl + containerId + '/comments';
    },
    createAttachments: function (containerId) {
      return this.basedUrl + containerId + '/attachments';;
    },
    getIssueType:function(containerId){
      return this.basedUrl + containerId + '/ng-issue-types?include=subtypes';; 
    },
    getRootCause:function(containerId){
      return this.basedUrl + containerId + '/root-causes';; 
    }
  }
};
