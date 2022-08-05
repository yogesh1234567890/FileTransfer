const params = new URLSearchParams(window.location.search);
if (params.get('role')=='sender'){
   $('#connectionbox').hide();
   $('#receive-progress').hide();
}
if (params.get('role')=='receiver'){
    $('#send-progress').hide();
    $('#file-upload').hide();
 }
