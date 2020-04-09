<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>WebRTC</title>
    <link href="style.css" rel="stylesheet" type="text/css" />
    <style type="text/css">
        #console {
            position : fixed;
            top : 5px;
            right : 5px;
            width : 400px;
            height : 300px;
            border : 1px solid black;
            overflow: scroll;
            font-size : 8pt;
            background-color : white;
        }
    </style>
<script src="https://webrtc.github.io/adapter/adapter-latest.js"></script>
</head>

<body>
<div id="login">
    <label for="username">Login</label>
    <input id="username" placeholder="Login" required="" autofocus="">
    <button id="login">Login</button>
</div>

<div id="call">
    <video id="local" autoplay muted></video>
    <video id="remote" autoplay></video>

    <div>
        <input id="username-to-call" placeholder="Username to call" />
        <button id="call">Call</button>
        <button id="close-call">Close call</button>
    </div>
</div>

<div id="console">

</div>
</body>

<script type="text/javascript">
<?php
echo "const turnProvider = [";
$data = array( "format" => "urls" );
$data_json = json_encode($data);

$curl = curl_init();
curl_setopt_array( $curl, array (
      CURLOPT_HTTPHEADER => array("Content-Type: application/json","Content-Length: " . strlen($data_json)),
      CURLOPT_POSTFIELDS => $data_json,
      CURLOPT_URL => "https://global.xirsys.net/_turn/{{NAMESPACE}}",
      CURLOPT_USERPWD => "{{USER}}:{{PWD}}",
      CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
      CURLOPT_CUSTOMREQUEST => "PUT",
      CURLOPT_RETURNTRANSFER => 1
));

$resp = curl_exec($curl);
if(curl_error($curl)){
      echo "Curl error: " . curl_error($curl);
};
curl_close($curl);
$response = json_decode($resp, true);
$iceServers = $response['v']['iceServers'];
echo json_encode($iceServers);
echo "]";
?>
</script>

<script src="client.js"></script>

</html>
