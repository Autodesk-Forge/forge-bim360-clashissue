class ClashRawView {

  constructor() {
    this._clashJsonObj = null
    this._clashInsJsonObj = null
    this._testObj = null 
    this._selectedClashes = null
    this._clashtable = null
  }

  reset() {

    //clear table
    if(this._clashtable) 
       this._clashtable.rows().clear().draw() 
    this._clashJsonObj = null
    this._clashInsJsonObj = null
    this._testObj = null 
    this._selectedClashes = null 
  }

  async initClashRawHeader(){
    var cols = [
      { data: '0',title:"Inst Id",orderable:false},
      { data: '1',title:"Distace",orderable:false},
      { data: '2',title:"Status",orderable:false},
      { data: '3',title:"L Model Id",orderable:false},
      { data: '4',title:"R Model Id",orderable:false},
      { data: '5',title:"L View Id",orderable:false},
      { data: '6',title:"R View Id",orderable:false} 
    ]
    this._clashtable = $('#clashRawTable').DataTable( {
      columns: cols,ordering:false,searching: false,
      bPaginate : true, pagingType: 'simple', 
      info: false,scrollY:"40vh",
      scrollCollapse: true
     } );   
  }

  async produceClashRawTable(mc_container_id, ms_id, ms_v_id) {

    try {
       $('#clashviewSpinner').css({ display: "block" })

      
      //reset data
      this.reset() 
      //get raw clash data from server
      const clashData = await this.getRawData(mc_container_id, ms_id, ms_v_id) 
      this._clashInsJsonObj = clashData.clashInsJsonObj
      this._clashJsonObj = clashData.clashJsonObj
      this._testJsonObj = clashData.testJsonObj  
      
      //render the table
      var rows =[]
      for (let index in this._clashJsonObj.clashes) {
        var eachItem = this._clashJsonObj.clashes[index];

        var ins = this._clashInsJsonObj.instances.filter(
          function (data) { return data.cid == eachItem.id }
        ); 
        var row={'0':eachItem.id,'1':eachItem.dist,'2':eachItem.status,'3':ins[0].ldid,'4':ins[0].rdid,'5':ins[0].lvid,'6':ins[0].rvid}
        rows.push(row)
      }
      this._clashtable.rows.add(rows).draw( false );   

      //since the content is switched to panel view, invoke tooltip style
      //$('[data-toggle="tooltip"]').tooltip()
      $('#clashviewSpinner').css({ display: "block" })

      //this.delegateTableTooltip()

      global_Utility.successMessage('Produce ClashRawTable Succeeded!')  
      $('#clashissueSpinner').css({ display: "none" })

      return true
    }
    catch(e){
      console.log('Produce ClashRawTable Failed!! ' + e )  
      global_Utility.failMessage('Produce ClashRawTable Failed!')  
      $('#clashissueSpinner').css({ display: "none" })

      return false
    }
  }

  /**
 * Promised function for loading Forge derivative manifest 
 */
  getRawData(mc_container_id, ms_id, ms_v_id) {
    var _this = this
    return new Promise((resolve, reject) => {
      $.ajax({
        url: '/mc/clash/getRawClashData/' + mc_container_id + '/' + ms_id + '/' + ms_v_id,
        type: 'GET',
        success: (data) => { 
          const depressedData = new TextDecoder("utf-8").decode(pako.inflate(data))
          const clashData = JSON.parse(depressedData)
          resolve(clashData)
        }, error: (error) => {
          reject(null)
        }
      });
    })
  }

  delegateTableTooltip() {
    $('*[data-poload]').hover(function () {

      const mc_containter_id = $('#projects_list .active').attr('id');
      const ms_id = $('#modelsetList .active').attr('id');
      const ms_v_id = $('#modelsetList .active').find("span")[0].innerHTML.replace('v-', '');

      let a = $(this)
      a.off('hover')
      let aValue = a.html()
      let td = a.parent()
      const tdIndex = td.index()
      const colName = td.closest('table').find('th').eq(tdIndex).text()
      let poloadUrl = ''
      if (colName == 'L Model Id')
        poloadUrl = '/mc/modelset/getDocName/' + mc_containter_id + '/' + ms_id + '/' + ms_v_id + '/' + aValue
      else if (colName == 'R Model Id')
        poloadUrl = '/mc/modelset/getDocName/' + mc_containter_id + '/' + ms_id + '/' + ms_v_id + '/' + aValue
      else if (colName == 'L View Id') {
        //find document number id
        let lclashDocId = (td.closest("tr").find("td a")[2]).innerHTML
        poloadUrl = '/mc/index/getObjectInfo/' + mc_containter_id + '/' + ms_id + '/' + ms_v_id + '/' + lclashDocId + '/' + aValue
      }
      else if (colName == 'R View Id') {
        //find document number id 
        let rclashDocId = (td.closest("tr").find("td a")[3]).innerHTML
        poloadUrl = '/mc/index/getObjectInfo/' + mc_containter_id + '/' + ms_id + '/' + ms_v_id + '/' + rclashDocId + '/' + aValue
      } else {
        return
      }
      $.get(poloadUrl, function (data) {
        if (data.error)
          a.popover({ content: data.error }).popover('show');
        else
          a.popover({ content: data.content }).popover('show');
      });
    }, function () {
      $.find('.popover').forEach(function (one) {
        one.remove()
      })
    });
  }
}
