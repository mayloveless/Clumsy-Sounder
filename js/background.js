
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
	            currentStatus();
	        }
	    });
	};

	var getProgramList = function(programUrl,fn){
        $.ajax({
			url: 'http://wangaibing.sinaapp.com/csGetAlbumSongsInfo?url=http://music.douban.com/subject/25716528/',
			type : 'get',
			dataType: "json",
	    	
	    	success: function (res) {
	    		var sdata = JSON.parse(res)['data'];
	    		console.log(sdata);
             	if ( sdata  ){
             		var dataLength = sdata.length;
					sdata[ dataLength-1 ]['backLength'] = dataLength ;
					for(var i= 0; i<dataLength; i++){
						list.push(  sdata[i] );
					}
					if (fn) {fn();}
				    currentStatus();
             	}
            }
        });
	};

	var creatNotification = function(lrc,title,pic,noticeTime){
		//桌面通知初始化
		if( notification ){
			//notification.close();
			chrome.notifications.clear( notification,function(){} );
		}
		var picture = pic ? pic : 'icon.png';

		var eventTime = noticeTime ? noticeTime : 0;
		chrome.notifications.create(
		    'ClumsySounder',{   
			    type: 'basic', 
			    iconUrl: picture, 
			    title: title, 
			   // eventTime:Date.now() + eventTime*1000,
			    message: lrc
			    
		    },
			function(notificationId) {
				notification = notificationId;
			} 
		);

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
			if(parseInt(localStorage.isLrc)){
				creatNotification('请稍后……','Clumsy Sounder');
			}
		}else{		
			if ( list[current-1] && list[current-1].backLength ){
				current -= list[current-1].backLength;
				playSongs();
				return false;
			}
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
				}else if (msg.playChannel){
					getList(type,channel,playSongs);
				}else{
					getProgramList(localStorage.channel,playSongs);
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
				creatNotification('请稍后……','Clumsy Sounder')
				break;

				case 'unlrc' :
				localStorage.isLrc = 0;
				//notifyFn();
				if(notification){
					//notification.close();
					chrome.notifications.clear( notification,function(){} );
				}
				break;
				
				case 'changeChannel':
				localStorage.chnList = msg.chnList;
				break;

				case 'next':
				isLoop = 0;
				playSongs();
				//由于歌词有延时，所以发个省略号
				if(parseInt(localStorage.isLrc)){
					creatNotification('请稍后……','Clumsy Sounder');
				}
				currentStatus();
				break;

				case 'prev':
				isLoop = 0;
				if(current-2 >= 0){
					current = current-2;
					playSongs();
				}
				if(parseInt(localStorage.isLrc)){
					creatNotification('请稍后……','Clumsy Sounder');
				}
				currentStatus();
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

				case 'addProgram':
                var programUrl = localStorage.channel = msg.programID;
				list.splice(current,list.length-current+1);
				getProgramList(programUrl,playSongs);
				break;

			}
		}.bind(this));

		//根据歌曲时间循环 向notification设置歌词
		var noUp = false;
		$('#player')[0].addEventListener('timeupdate', function(event){	
			var curTime = parseInt($('#player')[0].currentTime);
			var lrc = list[current-1].lrc;
			if(notification && lrc && parseInt(localStorage.isLrc)){		
				if(lrc && lrc[curTime] && notifyLrc != lrc[curTime]){
					var thisSong = list[current-1];
					var noticeTime = 0;
					for(var key in lrc){
						if (key > curTime){
							noticeTime = key - curTime;
							break;
						}
					}

					creatNotification(lrc[curTime],thisSong.title+' by '+thisSong.artist,thisSong.picture,noticeTime);
					notifyLrc = lrc[curTime];
				}
				noUp = false;
				return false;
			}
			if(!lrc && !noUp && curTime > 10){
				creatNotification('非常抱歉，没有找到歌词','Clumsy Sounder');
				noUp = true;
			}
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
