<?php

/**
 * A single message sent to an individual
 */
class LiveChatMessage extends DataObject {
	public static $db = array(
		'Message' => 'Text',
		"FromIP" => 'Text',
		"FromName" => 'Text', // ID for anonymous conversations 
		'Read' => 'Boolean'
	);
	public static $has_one = array(
		"From" => "Member",
		"To" => "Member"
	);
}