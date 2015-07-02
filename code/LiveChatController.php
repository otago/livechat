<?php

class LiveChat_Controller extends Controller {

	private static $url_handlers = array(
		'member-search' => 'member_search',
		'poll' => 'get_poll',
		'messages' => 'get_messages',
		'message' => 'set_message',
		'delete' => 'delete_message'
	);
	private static $allowed_actions = array(
		'member_search',
		'get_poll',
		'get_messages',
		'set_message',
		'delete_message'// removes messages to/from a user
	);

	/**
	 * Use to find a user. returns AJAX
	 * @param GET 'query' a search string for a user
	 * @param SS_HTTPRequest $request
	 */
	public function member_search(SS_HTTPRequest $request) {
		if (!Permission::checkMember(Member::currentUser(), "CMS_ACCESS_LiveChatAdmin")) {
			header("HTTP/1.0 403 Forbidden");
			die('You do not have permission to use the live chat module');
		}

		if ($request->getVar('query')) {
			$query = Convert::raw2sql($request->getVar('query'));

			//Search for our query - Pretty basic example here
			$Results = DataObject::get('Member', "FirstName LIKE '%$query%' OR Surname LIKE '%$query%'");

			//For AutoComplete
			$Members = $Results->map('ID', 'Name');

			$Suggestions = json_encode($Members->toArray());

			header('Content-Type: application/json');
			die('{"query" : "' . $query . '","suggestions" : ' . $Suggestions . '}');
		}
		header("HTTP/1.0 400 Bad Request");
		die('No member found');
	}

	/**
	 * Polls the message queue. Will return a map of senders with the lastest message ID
	 * @see http://stackoverflow.com/questions/12102200/get-records-with-max-value-for-each-group-of-grouped-sql-results
	 * @param GET 'lastid' the highest ID in you message queue
	 * @param SS_HTTPRequest $request
	 */
	public function get_poll(SS_HTTPRequest $request) {
		if (!Permission::checkMember(Member::currentUser(), "CMS_ACCESS_LiveChatAdmin")) {
			header("HTTP/1.0 403 Forbidden");
			die(Debug::friendlyError(500, 'You do not have permission to use the live chat module'));
		}
		if (!$request->getVar('lastid')) {
			header("HTTP/1.0 400 Bad Request");
			die(Debug::friendlyError(500, 'No last id supplied'));
		}

		// find the messages that have been sent to you
		$query1 = new SQLQuery("*", "LiveChatMessage", "ToID = " . (int) Member::currentUserID());
		$query1->addWhere("ID >= '" . (int) $request->getVar('lastid') . "'");
		$query1->addOrderBy("ID DESC");

		$result = $query1->execute();
		$returnar = array();

		// add the names to the array
		foreach ($result as $id) {
			$member = Member::get()->byID($id['FromID']);
			$returnar[$id['ID']] = array(
				"Name" => $member ? $member->getName() : 'User #' . $id['FromID'],
				"FromID" => $id['FromID'],
				"Read" => $id['Read'],
				"Message" => $id['Message']
			);
		}

		header('Content-Type: application/json');
		die(json_encode($returnar));
	}

	/**
	 * sends a message to user
	 * @param POST 'Message'
	 * @param POST 'To'
	 * @param SS_HTTPRequest $request
	 */
	public function set_message(SS_HTTPRequest $request) {
		if (!Permission::checkMember(Member::currentUser(), "CMS_ACCESS_LiveChatAdmin")) {
			header("HTTP/1.0 403 Forbidden");
			die('You do not have permission to use the live chat module');
		}

		if (!$request->postVar('Message')) {
			header("HTTP/1.0 400 Bad Request");
			die('No Message found');
		}

		if (!$request->postVar('To')) {
			header("HTTP/1.0 400 Bad Request");
			die('No target user ID found');
		}

		LiveChatMessage::create(array(
			'Message' => htmlentities($request->postVar('Message')),
			'ToID' => is_numeric($request->postVar('To')) ? $request->postVar('To') : 0,
			'Read' => false,
			'FromID' => Member::currentUserID(),
			'FromIP' => $request->getIP()
		))->write();

		die(); // success
	}

	/**
	 * returns all messages from and to yourself and another user
	 * @param GET ID Id of the target person 
	 * @param GET FromName name of the target person
	 * @param SS_HTTPRequest $request
	 */
	public function get_messages(SS_HTTPRequest $request) {
		if (!Permission::checkMember(Member::currentUser(), "CMS_ACCESS_LiveChatAdmin")) {
			header("HTTP/1.0 403 Forbidden");
			die('You do not have permission to use the live chat module');
		}
		if (!$request->getVar('ID') && !$request->getVar('FromName')) {
			header("HTTP/1.0 400 Bad Request");
			die('No Message found');
		}
		$returnar = null;
		if ($request->getVar('ID')) {
			$returnar = LiveChatMessage::get()->alterDataQuery(function($query, $list) {
				$subquery = $query->disjunctiveGroup();
				$subquery->whereAny("\"FromID\" = " . (int) $_GET['ID'] . ' AND "ToID" = ' . Member::currentUserID());
				$subquery->whereAny("\"FromID\" = " . Member::currentUserID() . ' AND "ToID" = ' . (int) $_GET['ID']);
			});
		}
		if ($request->getVar('FromName')) {
			$returnar = LiveChatMessage::get()->alterDataQuery(function($query, $list) {
				$subquery = $query->disjunctiveGroup();
				$subquery->whereAny("\"FromName\" = " . Convert::raw2sql($request->getVar('FromName')) . ' AND "ToID" = ' . Member::currentUserID());
				$subquery->whereAny("\"FromID\" = " . Member::currentUserID() . ' AND "FromName" = ' . Convert::raw2sql($request->getVar('FromName')));
			});
		}

		header('Content-Type: application/json');

		// update the messages as being read
		foreach ($returnar as &$mesg) {
			if (!$mesg->Read) {
				$mymsg = LiveChatMessage::get()->byID($mesg->ID);
				$mymsg->Read = true;
				$mymsg->write();
			}
		}
		die(json_encode($returnar->toNestedArray()));
	}

	/**
	 * deletes all your messages, given an ID or a FromName
	 * @param GET ID Id of the target person 
	 * @param GET FromName name of the target person
	 * @param SS_HTTPRequest $request
	 */
	public function delete_message(SS_HTTPRequest $request) {
		if (!Permission::checkMember(Member::currentUser(), "CMS_ACCESS_LiveChatAdmin")) {
			header("HTTP/1.0 403 Forbidden");
			die('You do not have permission to use the live chat module');
		}
		if (!$request->getVar('ID') && !$request->getVar('FromName')) {
			header("HTTP/1.0 400 Bad Request");
			die('No Message found');
		}
		$returnar = array();
		if ($request->getVar('ID')) {
			$returnar = LiveChatMessage::get()->alterDataQuery(function($query, $list) {
				$subquery = $query->disjunctiveGroup();
				$subquery->whereAny("\"FromID\" = " . (int) $_GET['ID'] . ' AND "ToID" = ' . Member::currentUserID());
				$subquery->whereAny("\"FromID\" = " . Member::currentUserID() . ' AND "ToID" = ' . (int) $_GET['ID']);
			});
		}
		if ($request->getVar('FromName')) {
			$returnar = LiveChatMessage::get()->alterDataQuery(function($query, $list) {
				$subquery = $query->disjunctiveGroup();
				$subquery->whereAny("\"FromName\" = " . Convert::raw2sql($request->getVar('FromName')) . ' AND "ToID" = ' . Member::currentUserID());
				$subquery->whereAny("\"FromID\" = " . Member::currentUserID() . ' AND "FromName" = ' . Convert::raw2sql($request->getVar('FromName')));
			});
		}
		header('Content-Type: application/json');
		foreach ($returnar as &$mesg) {
			$mesg->delete();
		}
		die();
	}

}
