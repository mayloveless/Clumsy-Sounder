
var dfm = {};

$(document).ready(function(){
    defaultChanel = [-3,0,1,2,9,27,61];
    
    fm = chrome.extension.connect({name: 'fm'});

	var isLogin = localStorage.isLogin;
	
	var new_img = function(){
	 	$.ajax({
	        url: 'http://douban.fm/j/new_captcha',
	        type: 'get',
	        success: function (data) {
	        	var data = data.replace(/\"/g, "");
	            $('#loginForm').find('[name=captcha_id]').val(data);
	            $('#loginForm').find('img').attr('src', 'http://douban.fm/misc/captcha?size=m&id=' + data);
	        }
        });
	};

	var init = function(){
		var channel = Number(localStorage.channel);
     				
		fm.onMessage.addListener(function (msg) {
			switch (msg.cmd) {
				case 'build':
				if(!msg.isPlay){
					fm.postMessage({cmd: 'play'});	
				}	
				if(msg.pause){
					$('#play').html('P');
					$('#play').attr('title','播放');
				}else{
					$('#play').html('7');
					$('#play').attr('title','暂停');
				}
				if(msg.like){
					$('#like').addClass('liking');
				}else{
					$('#like').removeClass('liking');
				}
				if(msg.loop){
					$('#repeat').addClass('current');
				}else{
					$('#repeat').removeClass('current');
				}
				
				if(Number(msg.lrc)){
					$('#lrc').addClass('current');
					$('#lrc').attr('title','隐藏歌词');
				}else{
					$('#lrc').removeClass('current');
					$('#lrc').attr('title','显示歌词');
				}
				if(msg.info){
					$('#cs_info').html(msg.info.artist+':&nbsp;&nbsp;'+msg.info.title+'<br/>Ablum:&nbsp;&nbsp;<a target="blank" href="http://music.douban.com'+msg.info.albumUrl+'">'+msg.info.albumtitle+'</a>');
				}
				
				if(msg.chnList){
					var list = msg.chnList.split(',');	
					for(var i=0;i<list.length;i++){
						var single = list[i].split('|');
						var isHas = 0;
						for(var j=0;j<$('#channel>option').length;j++){
					    	if(parseInt($('#channel>option')[j].value,10) === parseInt(single[0],10)){
					    		isHas = 1;
					    		break;
					    	}
					    }
					    if(!isHas){
					    	$('#channel').append("<option value='"+single[0]+"'>"+single[1]+"</option>");
					    }
					}
					
					
				}
				if(msg.channel){
					for(var i=0;i<$('#channel>option').length;i++){
				    	if($('#channel>option')[i].value==msg.channel){
				    		$('#channel>option')[i].selected = true;
				    	}
				    }
				}
				break;

				case 'shareInfo' :
				if(msg.title){
					if(msg.from =='sina'){//appkey=1827380915
						if(msg.url){
							window.open('http://v.t.sina.com.cn/share/share.php?title=推荐音乐：【'+encodeURIComponent(msg.title)+"】 音乐人：【"+encodeURIComponent(msg.artist)+"】 收听地址：http://music.baidu.com/song/"+msg.url+'&content=utf-8&pic='+msg.pic);
						}else{
							window.open('http://v.t.sina.com.cn/share/share.php?title=推荐音乐：【'+encodeURIComponent(msg.title)+"】 音乐人：【"+encodeURIComponent(msg.artist)+"】 "+'&content=utf-8&pic='+msg.pic);
						}
						
					}else if(msg.from =='douban'){
						//window.open('http://widget.renren.com/dialog/share?resourceUrl='+msg.url+'&title=推荐音乐：【'+msg.title+'】 音乐人：【'+msg.artist+'】&pic='+msg.pic);
					}
				}			
				break;
			}
		}.bind(this));
	
	};

	if(!isLogin){
		$('#fn').css('display','none');
		$('#loginForm').css('display','block');
		new_img();
	}else{
		$('#fn').css('display','block');
		$('#loginForm').css('display','none');
		init();
		fm.postMessage({cmd: 'check'});
	}

	$('#play').click(function(event){
		event.stopPropagation();
		var channel = Number(localStorage.channel);
		if($('#play').html()=='P'){
			$('#play').text('7');
			$('#play').attr('title','暂停');
			fm.postMessage({cmd: 'play',type:'n',channel:channel,inMiddle:1});
			return;
		}else{
			$('#play').text('P');
			$('#play').attr('title','播放');
			fm.postMessage({cmd: 'pause',type:'n',channel:channel});
			return;
		}
		
	});

	$('#repeat').click(function(event){
		event.stopPropagation();
		if($('#repeat').hasClass('current')){
			fm.postMessage({cmd: 'unloop'});
			$('#repeat').removeClass('current');
			$('#repeat').attr('title','循环');
		}else{
			fm.postMessage({cmd: 'loop'});
			$('#repeat').addClass('current');
			$('#repeat').attr('title','取消循环');
		}
		
	});

	$('#lrc').click(function(event){
		event.stopPropagation();
		if($('#lrc').hasClass('current')){
			fm.postMessage({cmd: 'unlrc'});
			$('#lrc').removeClass('current');
			$('#lrc').attr('title','显示歌词');
		}else{
			fm.postMessage({cmd: 'lrc'});
			$('#lrc').addClass('current');
			$('#lrc').attr('title','隐藏歌词');
		}
	});


	//chanel 删除事件绑定
	var del  =function(event){
		var target = event.target.parentNode;
		var chnNumber = parseInt($(target).children('.num').text(),10);
		for(var j=0;j<$('#channel>option').length;j++){
	    	if(parseInt($('#channel>option')[j].value,10) === chnNumber){
	    		$($('#channel>option')[j]).remove();
	    		break;
	    	}
	    }
		$(target).remove();
	};
	//搜索界面show
	$('#changeChannel').click(function(){
		$('#searchPanle').fadeIn();
		$('#fn').hide();
		$('#extra').empty();
		$('#number').empty();

		if(localStorage.chnList){
			var list = localStorage.chnList.split(',');
		}else{
			return;
		}
		for(var i= 0;i<list.length;i++){
			var one = list[i].split("|");
			$('#extra').append('<li><span class="name">'+one[1]+'</span><span class="num">'+one[0]+'</span><span class="del">X</span></li>');
		}
		//删除频道事件绑定
		$('.del').unbind().bind('click',del);
	});

	//search 输入框事件绑定
	$('#search').bind('keydown',function(event){
		if(event.keyCode === 13){
			$.ajax({
				url: 'http://douban.fm/j/explore/search',
				type : 'get',
				dataType: "json",
		    	data: {
		    		'query':$('#search').val(),
		    		'start':0,
		    		'limit':1
		    	},
		    	success: function (res) {
		    		var data = res.data.channels[0];
		    		if(!data){
		    			$('#searchOne').html('sorry,no results.plz try again');
		    			$('#add').hide();
		    			return;
		    		}
		    		var name = data.name;
		    		var intro = data.intro;
		    		var id = data.id;
		    		var pic = data.cover;
		    		if($('#searchOne')){
		    			$('#searchOne').remove();
		    		}
		    		$('#searchRes').prepend('<div id="searchOne"><img src="'+pic+'"/><span class="name">'+name+'</span><span class="intro">'+intro+'</span><span style="display:none" class="id">'+id+'</span></div>');

		    		$('#add').show();
		        }
			});
		}
	});

	//增加频道
	$('#add').click(function(){
		var num = parseInt($('#searchOne>.id').text(),10);
		var name = $('#searchOne>.name').text();
		var list = $('#extra').children();
		var isHas = 0;
		for(var j = 0;j<defaultChanel.length;j++){
			if(defaultChanel[j] === num){
				$('#searchOne').html("已存在");
				$('#add').hide();
				return;
			}
		}
		for(var i= 0;i<list.length;i++){
			if(parseInt($(list[i]).children('.num').text(),10) === num){
				isHas = 1;
				break;
			}
		}
		if(!isHas){
			$('#extra').append('<li><span class="name">'+name+'</span><span class="num">'+num+'</span><span class="del">X</span></li>');
		}
		//删除频道事件绑定
		$('.del').unbind().bind('click',del);
	});

	//搜索保存并退出
	$('#searchSave').click(function(){
		var extra = $('#extra').children();
		var list = [];

		for(var i=0;i<extra.length;i++){
			var chnNumber =  parseInt($(extra[i]).children('.num').text(),10);
			var chnName  =$(extra[i]).children('.name').text();
			var one = chnNumber+"|"+chnName;
			var isHas = 0;
			list.push(one);
			for(var j=0;j<$('#channel>option').length;j++){
		    	if(parseInt($('#channel>option')[j].value,10) === chnNumber){
		    		isHas = 1;
		    		break;
		    	}
		    }
		    if(!isHas){
		    	$('#channel').append("<option value='"+chnNumber+"'>"+chnName+"</option>");
		    }
	    }
		fm.postMessage({cmd: 'changeChannel',chnList:list.join(',')});
		$('#searchPanle').fadeOut('normal',function(){
			$('#fn').show();
		});
		
	});

	$('#next').click(function(){
		fm.postMessage({cmd: 'next'});
	});

	$('#prev').click(function(){
		fm.postMessage({cmd: 'prev'});
	});

	$('#like').click(function(event){
		event.stopPropagation();
		if($('#like').hasClass('liking')){
			fm.postMessage({cmd: 'unlike'});
			$('#like').removeClass('liking');
			$('#like').attr('title','喜欢');
		}else{
			fm.postMessage({cmd: 'like'});
			$('#like').addClass('liking');
			$('#like').attr('title','取消喜欢');
		}
	});

	$('#trash').click(function(){
		fm.postMessage({cmd: 'trash'});
	});

	$('#channel').change(function(){
		var value = $('#channel').val();
		fm.postMessage({cmd: 'channel',channel:value});
	});

	$('#shareSina').click(function(){
		fm.postMessage({cmd: 'share',from:'sina'});
	});


	//绑定登陆表单事件
	$('#username,#password,#captcha_solution').bind('focus',function(){
		$(this).css('background','#fff');
		$('#submit').css('background','#4CBEFF');
		$('#tip').html('');
	});
	$('#username,#password,#captcha_solution').bind('blur',function(){
		$(this).css('background','#E9F4E9');
	});
	//验证码换一换
	$('#form_img').bind('click',new_img);
	//提交
	$('#submit').bind('click',function(e){
		
		var name = $('#username').val();
		var pwd = $('#password').val();
		if(name == ''||pwd == ''){
			$('#tip').html('请输入完整信息进行登录！');
			return;
		}
		$('#submit').css('background','#C7CACC');
		$.ajax({
			url: 'http://douban.fm/j/login',
            type: 'post',
            data: $('#loginForm').serialize(),
            dataType: "json",
            success: function (data) {
            	if (data.r === 1) {
                    new_img();
                    $('#tip').html(data.err_msg);
                }else if (data.r === 0) {
                    chrome.cookies.get({
                        url: 'http://douban.fm',
                        name: 'dbcl2'
                    }, function (c) {console.log(c)
                        chrome.cookies.set({
                            url: 'http://douban.com',
                            name: 'dbcl2',
                            value: c.value,
                            domain: '.douban.com',
                            path: '/',
                            secure: c.secure,
                            httpOnly: c.httpOnly,
                            expirationDate: c.expirationDate,
                            storeId: c.storeId
                        });
                    });
                   // localStorage.username = name;
                   // localStorage.password = pwd;
                    localStorage.isLogin = true; 
                    $('#loginForm').css('display','none');
                    $('#fn').css('display','block');
                    init();
                    fm.postMessage({cmd: 'check'});
                }
            },
            error: function (xhr, err) {
                if(err === 'parsererror'){
                	//此错误说明fm已登录，返回了跳转页面豆瓣主页
                	//所以直接开启就可以了，有风险
                	$('#tip').html('您已在豆瓣fm网站登录，将自动跳转！');
                	setTimeout(function(){
                		localStorage.isLogin = true; 
	                    $('#loginForm').css('display','none');
	                    $('#fn').css('display','block');
	                    init();
	                    fm.postMessage({cmd: 'check'});	
                	},2000);	
                }
            }
        });
		e.preventDefault();
	});
	
	
	
	
});