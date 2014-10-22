$('.js-background').each(function() {
	var image = $(this).attr('data-bg');
	if (image) {
		$(this).css({
			'background-image': 'url(/images/' + image + ')',
			'background-size': '800px 158px',
			'background-repeat': 'no-repeat',
			'padding-top': '168px',
		});
	}
});

$('.js-image').each(function() {
	var image = $(this).attr('data-img');
	if (image) {
		$(this).prepend('<img class="left" src="/images/' + image + '" width="150" height="100"></img>');
	}
});
