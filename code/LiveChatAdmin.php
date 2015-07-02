<?php

class LiveChatAdmin extends LeftAndMain implements PermissionProvider {

	private static $url_segment = 'livechat';
	private static $url_rule = '/$LiveChatClass/$Action';
	private static $menu_title = 'Live Chat';
	private static $template_path = null; // defaults to (project)/templates/email
	private static $tree_class = 'LiveChat';
	private static $url_handlers = array(
		'$LiveChatClass/$Action' => 'handleAction'
	);

	public function init() {
		parent::init();
		Requirements::css(LIVECHAT_DIR . '/css/live-chat.css');
		Requirements::block(FRAMEWORK_DIR . '/javascript/HtmlEditorField.js');
		Requirements::block(FRAMEWORK_DIR . '/thirdparty/jquery-ui/jquery-ui.min.js');
		Requirements::javascript(LIVECHAT_DIR . '/javascript/LiveChatAdmin.js');
	}

	/**
	 * Has the user been granted access to view the Live Chat tab?
	 * @param Member|null $member
	 * @return boolean
	 */
	public function canView($member = null) {
		if (!$member && $member !== FALSE)
			$member = Member::currentUser();
		return Permission::checkMember($member, "CMS_ACCESS_LiveChatAdmin");
	}

	/**
	 * Returns the Breadcrumbs for the LiveChatAdmin
	 * @return ArrayList
	 */
	public function Breadcrumbs($unlinked = false) {
		return new ArrayList(array(
			new ArrayData(array(
				'Title' => 'live chat',
				'Link' => '/admin/' . self::$tree_class
					))
		));
		return parent::Breadcrumbs($unlinked);
	}

	/**
	 * Returns the link to the report admin section, or the specific report that is currently displayed
	 * @return String
	 */
	public function Link($action = null) {
		return self::join_links(parent::Link('index'), $action);
	}

	public function providePermissions() {
		$title = _t("LiveChatAdmin.MENUTITLE", LeftAndMain::menu_title_for_class($this->class));
		return array(
			"CMS_ACCESS_LiveChatAdmin" => array(
				'name' => _t('CMSMain.ACCESS', "Access to '{title}' section", array('title' => $title)),
				'category' => _t('Permission.CMS_ACCESS_CATEGORY', 'CMS Access')
			)
		);
	}

	public function getEditForm($id = null, $fields = null) {
		$fields = new FieldList();
		$tabMesg = new Tab('MessageView', "New Message"); // this is a blank template for messages
		$tabChat = new Tab('NewChatView', "Start new chat");

		$tabs = new TabSet('Root', $tabChat, $tabMesg);

		$fields->push($tabs);

		$fields->addFieldsToTab('Root.NewChatView', array(
			TextField::create('Name', 'Find a Member to start chat'),
			LiteralField::create('StartChat', '<button id="LiveChatStartButton" disabled>Start Chat</button>')
		));

		$msgfrom = '<button class="closechatwindow">Close Chat</button>';
		$msgfrom .= '<div class="messagenamecontainer">';
		$msgfrom .= '<div class="messagetoname"></div>';
		$msgfrom .= '<div class="messagefromname">'.Member::currentUser()->getTitle().'</div>';
		$msgfrom .= '</div>';
		$msgfrom .= '<div class="livechatsessioncontainer"><div class="livechatsessionwrapper"><div class="livechatsession"></div></div></div>';

		$fields->addFieldsToTab('Root.MessageView', array(
			FieldGroup::create($title = '', array(
				LiteralField::create('SubmitNewMessage', $msgfrom)
			)),
			FieldGroup::create($title = 'Your message', array(
				TextareaField::create('NewMessageContent', '')->setColumns(80),
				LiteralField::create('SubmitNewMessage', '<button class="send">Send Message</button>')
			))
		));

		$actions = new FieldList();
		$form = new Form($this, "LiveChatForm", $fields, $actions);
		$form->addExtraClass('cms-edit-form cms-panel-padded center ' . $this->BaseCSSClasses());
		$form->loadDataFrom($this->request->getVars());

		$this->extend('updateEditForm', $form);

		return $form;
	}

}
