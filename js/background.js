
$(document).ready(function(){
	$('#player')[0].volume  = 1;
	list =[];
	current = 0;
	isPause = 0;
	isLike = 0;
	isLoop =0;
	localStorage.isLrc = localStorage.isLrc ? localStorage.isLrc : 0;
	localStorage.channel = localStorage.channel ? localStorage.channel : 0;
	localStorage.chnList = localStorage.chnList ? localStorage.chnList : '';
	localStorage.type = 'n';
	lrc = {};
	notifyLrc = '';
	notification  ='';

	var parseLrc = function(lrc){
        lrc = lrc.split('\n');
        var filter = /^((?:\[[\d.:]+?\])+?)([^\[\]]*)$/,
        nLrc = {};

        for (var i = 0, len = lrc.length, res, time ; i < len ; i += 1) {
            res = lrc[i].match(filter);
            if (res) {
                time = res[1].slice(1, -1).split('][');
                for (var j = 0, jLen = time.length, tmp ; j < jLen ; j += 1) {
                    tmp = time[j].split(':');
                    nLrc[Number(tmp[0])*60+Math.round(tmp[1])] = res[2];
                }
            }
        }
        return nLrc;
	};
	var getLrc = function(title,artist){
		var result ;
		$.ajax({
            url: 'http://openapi.baidu.com/public/2.0/mp3/info/suggestion',
            data: 'format=json&word='+encodeURIComponent(title.replace(/\(.+\)$/, ''))+'&callback=?',
             complete: function (res) {
             	//膈应接口返回数据的修整
             	//新版Chrome Extension不让用eval,new Function ,inline script等等等等，各种不爽啊
             	//xhr=>拿到数据，去掉多余的
             	//unUnicode=>把中文Unicode的编码解码，并去掉用于解码的%
             	//data=>JSON.parse转化为对象
             	var xhr = JSON.stringify(res.responseText).slice(2,-3);
             	xhr = xhr.replace(/\\\\\\\"/g, "'");
             	var unUnicode =unescape(xhr.replace(/\\/g, "%")).replace(/%%%"\S+"/g,function(s){
             		return s.replace(/"/g, "'").replace(/%/g, '');
             	}).replace(/%/g, '');
             	console.log(unUnicode);
             	var data = JSON.parse(unUnicode)['song'];

                if (!data) {return;}
                for (var i = 0, len = data.length ; i < len ; i += 1) {
                    if (artist.toLowerCase().indexOf(data[i].artistname.toLowerCase()) > -1) {
                        $.ajax({
                            url: 'http://ting.baidu.com/data/music/songlink',
                            data: 'type=mp3&speed=&songIds=' + data[i].songid,
                            dataType: 'json',
                            success: function (data) {
                                var song = data.data.songList[0];
                               	list[current-1].songId = song.songId;
                                if (song) {
                                    $.get('http://ting.baidu.com'+song.lrcLink, function (client) {
                                		list[current-1].lrc = parseLrc(client);
                           					console.log(list[current-1]);
                                    });
                                }
                            }
                        });
                        break;
                    }
                }
             }
        });
	};

	
	var getList = function(type,channel,fn){
		var data  =  "type="+type+"&channel="+channel+"&from=mainsite";
		localStorage.type = type;
		localStorage.channel = channel;
		$.ajax({
			url: 'http://douban.fm/j/mine/playlist',
			type : 'get',
			dataType: "json",
	    	data: data,
	    	success: function (data) {
	    		console.log(data);
	    		for(var i= 0;i<data.song.length;i++){
	    			list.push(data.song[i]);
	    		}	    		
	            if (fn) {fn();}
	        }
	    });
	};

	var notifyFn = function(){
		if(parseInt(localStorage.isLrc)){
			if(notification){
				currentStatus();
				return;
			}
			//桌面通知初始化
			notification = webkitNotifications.createHTMLNotification(
		 		'notification.html' 
			);					
			notification.show();
		}else{
			if(notification){
				notification.close();
			}
		}
		currentStatus();
		notification.onclose = function(){
			notification = null;
		};
	};
		
	var playSongs = function(){
		type = localStorage.type || 'n';
		channel = localStorage.channel || 0 ;
		if(list[current]!=undefined){
			$('#player').attr('src',list[current].url);
			//test 
			setTimeout(function(){
				$('#player')[0].play();
			},50);
			
			current++;
			getLrc(list[current-1].title,list[current-1].artist);
			notifyFn();
		}else{		
			getList(type,channel,playSongs);
		}
		
	};

	chrome.extension.onConnect.addListener(function(fm) {
		currentStatus = function(){
			var info={};
			if(list[current-1]){
				if(list[current-1].like==1){
					isLike = 1;
				}else{
					isLike = 0;
				}
				info ={
					title : list[current-1].title,
					albumtitle : list[current-1].albumtitle,
					artist : list[current-1].artist,
					albumUrl : list[current-1].album
				};
			}else if(list[0]&&current==0){
				if(list[0].like==1){
					isLike = 1;
				}else{
					isLike = 0;
				}
				info ={
					title : list[0].title,
					albumtitle : list[0].albumtitle,
					artist : list[0].artist,
					albumUrl : list[0].album
				};
			}
			if(isPause){
				chrome.browserAction.setIcon({path: 'icon_pause.png'});
			}else{
				chrome.browserAction.setIcon({path: 'icon.png'});
			}
		fm.postMessage({cmd: 'build',isPlay:1,pause:isPause,loop:isLoop,like:isLike,info:info,lrc:localStorage.isLrc,channel:localStorage.channel,chnList:localStorage.chnList});
		};
		fm.onMessage.addListener(function (msg) {
			
			type = localStorage.type;
			channel = localStorage.channel;
			inMiddle = msg.inMiddle;
			
			switch (msg.cmd) {
				case 'check':
				if($('#player').attr('src')!=''){
					currentStatus();
				}else{
					fm.postMessage({cmd: 'build',isPlay:0});
				}
				break;
				case 'play':
				if(inMiddle){
					$('#player')[0].play();	
				}else{
					getList(type,channel,playSongs);
				}
				chrome.browserAction.setIcon({path: 'icon.png'});
				break;

				case 'pause' :
				$('#player')[0].pause();
				chrome.browserAction.setIcon({path: 'icon_pause.png'});
				break;

				case 'loop' :
				isLoop = 1;
				break;

				case 'unloop' :
				isLoop = 0;
				break;

				case 'lrc' :
				localStorage.isLrc = 1;
				notifyFn();
				break;

				case 'unlrc' :
				localStorage.isLrc = 0;
				notifyFn();
				break;
				
				case 'changeChannel':
				localStorage.chnList = msg.chnList;
				break;

				case 'next':
				isLoop = 0;
				playSongs();
				//由于歌词有延时，所以发个省略号
				fm.postMessage({lrc:'……'},"notification.html");
				break;

				case 'prev':
				isLoop = 0;
				if(current-2 >= 0){
					current = current-2;
					playSongs();
				}
				fm.postMessage({lrc:'……'},"notification.html");
				break;

				case 'like' :
				if(list[current-1]){
					var sid = list[current-1].sid;
				}
				var data = "type=r&sid="+sid+"&channel="+localStorage.channel+"&from=mainsite";
				$.ajax({
					url: 'http://douban.fm/j/mine/playlist',
					type : 'get',
					dataType: "json",
			    	data: data,
			    	success: function (data) {
			    		if(list[current-1]){
			    			list[current-1].like = 1;
			    		}
			        }
   				});
				break;

				case 'unlike' :
				if(list[current-1]){
					var sid = list[current-1].sid;
				}
				var data = "type=u&sid="+sid+"&channel="+localStorage.channel+"&from=mainsite";
				$.ajax({
					url: 'http://douban.fm/j/mine/playlist',
					type : 'get',
					dataType: "json",
			    	data: data,
			    	success: function (data) {
			    		if(list[current-1]){
			    			list[current-1].like = 0;
			    		}
			        }
   				});
				break;

				case 'trash':
				if(list[current-1]){
					var sid = list[current-1].sid;
				}
				var data = "type=b&sid="+sid+"&channel="+localStorage.channel+"&from=mainsite";
				$.ajax({
					url: 'http://douban.fm/j/mine/playlist',
					type : 'get',
					dataType: "json",
			    	data: data,
			    	success: function (data) {
			    		current--;
			    		list.splice(current,1);
			    		playSongs();
			        }
   				});
				break;

				case 'channel':
				localStorage.channel = msg.channel;
				list.splice(current,list.length-current+1);
				getList(localStorage.type,localStorage.channel,playSongs);
				break;

				case 'share':
				var song = list[current-1];
				fm.postMessage({cmd: 'shareInfo',title:song.title,artist:song.artist,url:song.songId,pic:song.picture,from:msg.from});
				break;

				case 'notify':				
				fm.postMessage({title:list[current-1].title+' by '+list[current-1].artist},"notification.html");
				var curTime = parseInt($('#player')[0].currentTime);
				var lrc = list[current-1].lrc;
				if(!lrc){fm.postMessage({lrc:'……'},"notification.html");}
				if(lrc && lrc[curTime] && notifyLrc != lrc[curTime]){
					//因为popup页面关了，所以发送错误？？？如何监听popup页面？？
					//notify 也是
					fm.postMessage({lrc:lrc[curTime]},"notification.html");
					//if(notification){
					//	chrome.extension.getViews({type:"notification"}).inserLrc(lrc[curTime]);
					//}
					notifyLrc = lrc[curTime];
				}
				
				break;
			}
		}.bind(this));

		//根据歌曲时间循环 请求桌面提示页向background 请求歌词
		$('#player')[0].addEventListener('timeupdate', function(event){	
			fm.postMessage({getLrc:1});
		}, false);

		fm.onDisconnect.addListener(function (fm) {
            fm = null;
        }.bind(this));

	});

	$('#player')[0].addEventListener('ended', function(){	
		if(isLoop){
			current--;
		}
		playSongs();
		currentStatus();
	}, false);
	$('#player')[0].addEventListener('pause', function(){
		isPause = 1;
	}, false);
	$('#player')[0].addEventListener('play', function(){
		isPause = 0;
		//currentStatus();
	}, false);
});
