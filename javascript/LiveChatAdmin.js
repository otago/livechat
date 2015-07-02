/**
 * File: LiveChatAdmin.js
 */
(function ($) {
	$.entwine('ss', function ($) {

		var lastID = 0;	// the lastest message ID you've been updated with
		var mesgCount = 0;	// number of chat windows open
		var chatwindows = new Array();
		var firstopen = true;

		// poll the server for updated messages
		(function poll() {
			$.ajax({
				url: "/livechat-com/poll",
				type: "GET",
				data: {"lastid": (parseInt(lastID) + 1)},
				dataType: "json",
				success: function (data) {
					$.each(data, function (newid, value) {
						// if you've got an updated message , trigger a flash
						if (parseInt(newid) > parseInt(lastID)) {
							lastID = newid;

							// add new message to window
							tabpane = $('.ss-tabset div[aria-id=' + value.FromID + ']');
							chatpane = tabpane.find('.livechatsession').first();
							if (chatpane.size() > 0) {
								var newmessagedom = $('<div class="from-them">' + value.Message + '</div><div class="clear"></div>');
								chatpane.append(newmessagedom);
								chatpane.animate({scrollTop: chatpane[0].scrollHeight}, 1000);

								// pulsate the item 
								if (value.FromID in chatwindows) {
									divitem = $('.ui-tabs li[aria-id=' + value.FromID + ']');
									if ("false" === divitem.attr('aria-selected')) {
										for (i = 0; i < 3; i++) {
											divitem.fadeTo('fast', 0.2).fadeTo('fast', 1.0);
										}

										// if you're in a different tab, flash it 
										divitem2 = $('#Menu-LiveChatAdmin');
										if (!divitem2.hasClass('opened') && firstopen === false) {
											for (i = 0; i < 3; i++) {
												divitem2.fadeTo('fast', 0.2).fadeTo('fast', 1.0);
											}
										}
										// play incoming message sound
										if (canplayaudio) {
											var snd = new Audio("data:audio/mp3;base64," + incomingsound);
											snd.play();
										}
									}
								}
							}
						}
						chatwindows[value.FromID] = value;
					});
					firstopen = false;
					openallchatwindows();
				},
				complete: setTimeout(function () {
					poll()
				}, 10000),
				timeout: 3000
			})
		})();

		// will open up all the chat windows in your session
		var openallchatwindows = function () {
			for (var key in chatwindows) {
				user = chatwindows[key];
				createNewMessageConsole(key, user.Name);
			}
		}

		var canplayaudio = function () {
			var a = document.createElement('audio');
			return !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
		}


		// will use the API to transmit a message
		var sendmessage = function (to, message) {
			$.ajax({
				type: "POST",
				url: '/livechat-com/message',
				data: {'To': to, 'Message': message},
				success: function () {
					var containerpane = $(document).find('#Form_LiveChatForm [aria-id="' + to + '"]');
					var newmessagedom = $('<div class="from-me"></div><div class="clear"></div>');
					newmessagedom.first('.from-me').text(message)
					var livechatses = $(containerpane).find('.livechatsession').first();
					livechatses.append(newmessagedom);
					$(containerpane).find('textarea').val('');
					livechatses.animate({scrollTop: livechatses[0].scrollHeight}, 1000);
				},
				error: function () {
					err = 'An error occured while fetching data from the server\n Please try again later.';
					alert(ss.i18n._t('GRIDFIELD.ERRORINTRANSACTION', err));
				},
				dataType: "json"
			});
		};

		// create a mew a message tab for a user
		var createNewMessageConsole = function (id, name) {
			if ($('.ui-tabs [aria-id=' + id + ']').size() > 0) {
				return;
			}
			limessage = $('[aria-controls="Root_MessageView"]').first();

			// clone tab button
			newli = limessage.clone().show();
			newli.attr('aria-labelledby', 'ui-id-2-b-' + mesgCount);
			newli.find('a').attr('id', 'ui-id-2-b-' + mesgCount);
			newli.find('a').html('New Message window ' + mesgCount);
			newli.find('a').attr('href', newli.find('a').attr('href') + mesgCount);
			newli.removeAttr('aria-selected').removeClass('last');
			newli.removeClass("ui-tabs-active").removeClass("ui-state-active");

			newli.attr('aria-id', id);
			if (name) {
				newli.find('a').html(name);
			}
			limessage.parent().first().append(newli);

			// clone tabbing pane
			newpane = $('#Root_MessageView').clone();
			newpane.attr('id', 'Root_MessageView' + mesgCount);
			newpane.attr('aria-labelledby', 'Root_MessageView' + mesgCount);
			newli.attr('aria-controls', 'Root_MessageView' + mesgCount);
			newpane.addClass('liveChatMessagePage');
			newpane.attr('aria-id', id);
			$('#Root_MessageView').parent().append(newpane);

			// update the tabbing pane
			newli.attr('aria-controls', 'Root_MessageView' + mesgCount);
			newli.find('a').trigger('click');

			newpane.find('button.send').bind('click', function () {
				message = $(this).closest('.fieldgroup').find('textarea').val();
				if (message) {
					sendmessage($(this).closest('.liveChatMessagePage').attr('aria-id'), message);
				}
			})

			// removing the chat window. Will delete all message to and from a user
			newpane.find('button.closechatwindow').bind('click', function () {
				id = $(this).closest('.liveChatMessagePage').attr('aria-id');
				var mypane = $(this).closest('.liveChatMessagePage');
				$.ajax({
					url: "/livechat-com/delete",
					type: "GET",
					data: {"ID": id},
					dataType: "json",
					success: function (data) {
						delete chatwindows[id];
						$('li[aria-id="' + id + '"]').parent().find('li > a').first().trigger('click');
						var myid = mypane.closest('div.tab').attr('id');
						$("#" + myid).remove();
						$('li[aria-id="' + id + '"]').remove();
						$('.ss-tabset').tabs("refresh");
					}
				})
			})
			newpane.find('.messagetoname').html(name + ' #' + id);
			$('.ss-tabset').tabs("refresh");

			mesgCount++;
		}


		// when the user naviates to Live Chat tab
		$('.ss-tabset').entwine({
			// hide the new message tab
			onmatch: function () {
				$('[aria-controls="Root_MessageView"]').hide();
				$('#Root_MessageView').addClass('root_MessageView');
				openallchatwindows();
				this._super();
			},
			onunmatch: function () {
				this._super();
			},
			// clicking on a tab. Reloads the messages
			'ontabsbeforeactivate': function (e) {
				var mid = $(e.srcElement).parent().attr('aria-id');
				if (mid) {
					// no messages there, so try to populate 
					if ($('.liveChatMessagePage[aria-id=' + mid + ']').find('.livechatsession div').size() == 0) {
						$.ajax({
							url: "/livechat-com/messages",
							type: "GET",
							data: {"ID": mid},
							dataType: "json",
							success: function (data) {
								// clear the old messages
								$('.liveChatMessagePage[aria-id=' + mid + ']').find('.livechatsession').html('');
								chatpane = $('.liveChatMessagePage[aria-id=' + mid + ']').find('.livechatsession');
								$.each(data, function (key, value) {
									vclass = (value.ToID == mid) ? "from-me" : "from-them";
									newmesg = $('<div class="' + vclass + '"><p>' + value.Message
											+ '</p></div><div class="clear"></div>');
									chatpane.append(newmesg);
								});

								chatpane.animate({scrollTop: chatpane[0].scrollHeight}, 1000);
							}
						})
					}
				}
			}
		});

		// populate the dropdown with a list of the users
		$('.LiveChatAdmin [name=Name]').entwine({
			onfocusin: function (event) {
				var myliveautocompletetags;
				this.autocomplete({
					source: function (request, response) {
						$.getJSON('/livechat-com/member-search', {query: request.term})
								.done(function (data) {
									myliveautocompletetags = data.suggestions;
									response(data.suggestions);
								})
								.fail(function (e) {
									err = 'An error occured while fetching data from the server\n Please try again later.';
									alert(ss.i18n._t('GRIDFIELD.ERRORINTRANSACTION', err));
								});
					},
					select: function (event, ui) {
						// try to find the ID of the person you want to message
						for (var prop in myliveautocompletetags) {
							if (myliveautocompletetags.hasOwnProperty(prop) && myliveautocompletetags[prop] == ui.item.label) {
								$('#LiveChatStartButton').attr('data-id', prop);
								$('#LiveChatStartButton').attr('data-name', ui.item.label);
								$('#LiveChatStartButton').removeClass('ui-state-disabled').removeClass('ssui-button-disabled');
							}
						}

					}
				});
			}
		});

		// click the 'start chat' button
		$('.LiveChatAdmin #LiveChatStartButton').entwine({
			onclick: function (event) {
				if ($(this).attr('data-id')) {
					createNewMessageConsole($(this).attr('data-id'), $(this).attr('data-name'));
					$('.ui-tabs [aria-id=' + $(this).attr('data-id') + '] a').first().trigger('click');
				}
			}
		});


		var incomingsound = "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\
0mExtAKgqKkNaC4rVGRmZYCioYaXG0CH5hAlc6QFQb2ApS6kMjCgxDTpkEif1uTjRYLBV9dZSw0u\
qXZVKXVMAWdllWgsCSKftOUtihq3VIlnLLXiXMBTGcBbZ3UeWgKmLrAYTjomo+t1bRIZ75Qw5dyw\
xf5dL+uC8q5nfUBTpXk7DDkJTjwLKZQ9Ze0u0Ijmo5kKW9Yi7sOvFLHaUCaWXhYK4KPIAOWabPEE\
ekUnzQmgYq+G1iMVgpIZt0eS5LBaNHlq0TZbSsBZqXOU1CgzQszBX63Eu6XhZq6Jf0tKYEnKoC6v\
AysNqkrV5IrF3mbQQoMzoEoMhS9KyiyyfTKXVdFUsDOCxFnLDQYU3LWY7ycryU76l7S4qmt5W2Rs\
ic6WwEoEupOYCgTBiuI8AHKZOsRnq5KmTIaReoRurmYWD81JwkjkKRqBYLQsDsSB/NS0YkkrFP/y\
wsCiISlZ7BTgDGPxRMqGahHF/KiydRbSfFCVBVlSVBhl8OtKLTKzK5SrprbG9sgl0mBLxWUxtkDO\
20b5pqxUhkEpfYcCSAQRoYJDrvbRvmWsOZi1RmbgPpK6l2tMzVeWSF5mCqDIml9kPUPEQ090xBIY\
1E1gMjwbQguMUIIBVpgEJXDQm0xgiI4EMR1oIQBllIDqA3TMOiApIQqiFQoJEKx4Jb4uqjMk+qmn\
InWoggOLul9kC0tFKFN08C/RZkGkFDkhhUo6FAQkWnAiMgFQnJ2qGLwWOsxLpACXuQZQ6IzqLq2L\
HW4rEmKmkm6m8iEiCgiQ4odkO6DCIaICbiwa0GJqeWsqVSpPVLVKZMtQBSakVBlbV5LKW2tBdanC\
lypV5NHbmxBZ6XJdoGBEZCBJVQMoKiRwhc9BRINULJnJglyGbqRQBFqRGIkKVCVMQU1FMy45Ni4x\
VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\
VVVVVVVVVVVVVVVVVVVVVVX/8sLARzBUAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\
VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\
VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\
VVVVVVVVVVVVTEFNRTMuOTYuMVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\
VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\
VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\
VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\
VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVEFHTVNOAAAAAAAAAAAAAAAAAAAA\
AAAAAAAAAAAAAAAA8ezxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAw=";
	});
})(jQuery);
