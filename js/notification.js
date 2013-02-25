$(document).ready(function(){
	var notify = chrome.extension.connect({name: 'fm'});
	notify.postMessage({cmd: 'notify'});
	notify.onMessage.addListener(function (msg) {
		if(msg.title){
			$('#title').html(msg.title);
		}
		if(msg.lrc){
            $('#lrc').html(msg.lrc);
		}
		if(msg.getLrc){
			notify.postMessage({cmd: 'notify'});
		}
	}.bind(this));

	var inserLrc = function(lrc){
		 $('#lrc').html(lrc);
	};
});