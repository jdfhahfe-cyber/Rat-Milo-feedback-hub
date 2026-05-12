<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Fetch the response from reCAPTCHA widget
    $recaptchaResponse = $_POST['g-recaptcha-response'];
    $secretKey = '6LdtiuYsAAAAALH9DGpc3wphdXPgS7JRosd0KSxQ'; // Replace with your secret key

    // Send a request to Google's reCAPTCHA verification server
    $url = "https://www.google.com/recaptcha/api/siteverify";
    $data = [
        'secret' => $secretKey,
        'response' => $recaptchaResponse,
    ];

    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data),
        ],
    ];

    $context  = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    $result = json_decode($response, true);

    // Check if reCAPTCHA was successful
    if ($result['success']) {
        echo "Thank you for your feedback!";
    } else {
        echo "reCAPTCHA verification failed. Please try again.";
    }
}
?>
