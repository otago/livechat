<?php

/**
 * A single message sent to an individual
 */
class LiveChatMessage extends DataObject {
	public static $db = array(
		'Message' => 'Text',
		"FromIP" => 'Text',
		"FromName" => 'Text', // name for anonymous conversations. Must not be numeric. 
		'Read' => 'Boolean'
	);
	public static $has_one = array(
		"From" => "Member",
		"To" => "Member"
	);
}