# Live Chat

Enables users in the SilverStripe CMS to chat with other SilverStripe users,
or people online through the API.

![What the chat system looks like in the CMS](/images/messagewindow.png "CMS view of the Live Chat module")


## Usage

1. Install the module via composer require otago/livechat
2. run **/dev/build?flush=all**
3. enable the chat permission on the users/roles via the Security tab in the SilverStripe admin interface.


## Front end

You'll have to specify the calls manually if you want to enable this on the front 
end of your website. 


## How it works

By leveraging AJAX polling. You could enable something more fancy such as websockets
by using a custom front end. 