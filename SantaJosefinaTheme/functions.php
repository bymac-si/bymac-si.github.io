<?php
/**
 * Funciones personalizadas del theme Santa Josefina
 */

// Seguridad: evitar acceso directo
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* ============================================
   🔒 Seguridad básica
   ============================================ */

// Ocultar versión de WordPress
remove_action('wp_head', 'wp_generator');

// Ocultar enlaces innecesarios en el <head>
remove_action('wp_head', 'wlwmanifest_link'); // Windows Live Writer
remove_action('wp_head', 'rsd_link');         // Really Simple Discovery
remove_action('wp_head', 'wp_shortlink_wp_head');

// Eliminar REST API en cabecera
remove_action('wp_head', 'rest_output_link_wp_head');
remove_action('template_redirect', 'rest_output_link_header', 11);

// Desactivar XML-RPC (vector común de ataques)
add_filter('xmlrpc_enabled', '__return_false');

/* ============================================
   🔑 Seguridad en login
   ============================================ */

// Bloquear acceso directo a wp-login.php
function sj_block_wp_login() {
    $request = basename($_SERVER['REQUEST_URI']);
    if ($request === 'wp-login.php' || strpos($_SERVER['REQUEST_URI'], 'wp-login.php') !== false) {
        wp_die('Acceso restringido. Contacte al administrador.');
    }
}
add_action('init', 'sj_block_wp_login');

// URL personalizada de login
function sj_custom_login_url($login_url, $redirect, $force_reauth) {
    return home_url('/acceso-privado'); // 👈 Cambia la URL que quieras
}
add_filter('login_url', 'sj_custom_login_url', 10, 3);

// Mensajes de error genéricos en login
function sj_login_errors() {
    return 'Credenciales incorrectas.';
}
add_filter('login_errors', 'sj_login_errors');

// Desactivar sugerencias de usuario en login
add_filter('rest_endpoints', function($endpoints){
    if ( isset($endpoints['/wp/v2/users']) ) {
        unset($endpoints['/wp/v2/users']);
    }
    if ( isset($endpoints['/wp/v2/users/(?P<id>[\d]+)']) ) {
        unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    }
    return $endpoints;
});

/* ============================================
   🛡️ Ocultar rutas sensibles
   ============================================ */

// Reescribir /wp-admin/ y /wp-includes/ en .htaccess si quieres ocultarlos,
// aquí solo bloqueamos acceso directo a archivos importantes
function sj_block_sensitive_files() {
    if ( preg_match('/(wp-config\.php|readme\.html|license\.txt)/i', $_SERVER['REQUEST_URI']) ) {
        wp_die('Acceso denegado.');
    }
}
add_action('init', 'sj_block_sensitive_files');

/* ============================================
   ✨ Ajustes visuales login
   ============================================ */

// Logo personalizado en pantalla de login
function sj_login_logo() { ?>
    <style type="text/css">
        body.login div#login h1 a {
            background-image: url('/assets/img/logo_santajosefina.png');
            background-size: contain;
            width: 250px;
            height: 100px;
        }
    </style>
<?php }
add_action('login_enqueue_scripts', 'sj_login_logo');

// Cambiar enlace del logo en login
function sj_login_logo_url() {
    return home_url();
}
add_filter('login_headerurl', 'sj_login_logo_url');

// Cambiar el título del logo
function sj_login_logo_url_title() {
    return 'Santa Josefina CRM';
}
add_filter('login_headertext', 'sj_login_logo_url_title');