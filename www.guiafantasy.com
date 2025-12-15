

<!DOCTYPE html>
<html lang="es">


<head>



<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jugadores Liga Fantasy Relevo</title>

<meta name="description" content="Estadísticas de Jugadores Liga Fantasy EA Sport - Relevo">
<meta name="keywords" content="Estadísticas de Jugadores Liga Fantasy EA Sport - Relevo">




<!-- META PARA TWITTER-->

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@guiafantasy">
<meta name="twitter:creator" content="@guiafantasy">
<meta name="twitter:title" content="Estadísticas detalladas de jugadores en Liga Fantasy EA Sport - Relevo.">
<meta name="twitter:description" content="Estadísticas detalladas de jugadores en  Liga Fantasy EA Sport - Relevo.">
<meta name="twitter:image" content="https://www.guiafantasy.com/images/comuniate.jpg">


<!-- FAVICON FILES -->
<link href="/ico/apple-touch-icon-144-precomposed.png" rel="apple-touch-icon" sizes="144x144">
<link href="/ico/apple-touch-icon-114-precomposed.png" rel="apple-touch-icon" sizes="114x114">
<link href="/ico/apple-touch-icon-72-precomposed.png" rel="apple-touch-icon" sizes="72x72">
<link href="/ico/apple-touch-icon-57-precomposed.png" rel="apple-touch-icon" sizes="57x57">
<link href="/ico/favicon.png" rel="shortcut icon">

	<link rel="canonical" href="https://www.guiafantasy.com/jugadores>

<!-- CSS FILES -->

	<!-- CSS AUTOCOMPLETE -->
  	<link rel="stylesheet" href="/autocomplete/jquery-ui.css">
  	<link rel="stylesheet" href="/autocomplete/autocomplete.css">




<link href="https://www.guiafantasy.com/css/icomoon.css?version=2023" rel="stylesheet">
<link href="https://www.guiafantasy.com/css/bootstrap.min.css?cambios=button" rel="stylesheet">
<link href="https://www.guiafantasy.com/css/publicidad.css?cambios=intext2223" rel="stylesheet">


<link id="stylesheet" href="https://www.guiafantasy.com/css/style_black.css?modo=cabecerapuntos2324" rel="stylesheet">

<link href="https://www.guiafantasy.com/css/owl.carousel.min.css?modo=update23" rel="stylesheet">

<style>
.sm-ui-container .sm-controls.sm-skip-cross
{
	background-color:#CCC !important;
}

#HB_CLOSE_hbagency_space_89538 { width:40px !important;}
#HB_CLOSE_hbagency_space_89538 img { width:40px !important;}

</style>

<link href="https://www.guiafantasy.com/css/nav-area.css" rel="stylesheet">
<link rel="stylesheet" href="https://www.guiafantasy.com/css/icon-font.min.css">



<!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
<!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
<!--[if lt IE 9]>
      <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
      <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->

<meta name="theme-color" content="#5D0202 " />
<meta name="apple-itunes-app" content="app-id=1455536792">

<script async src="/js/quantcast.js?v=1"></script>


<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6831791801835929"  crossorigin="anonymous"></script>




<script language="javascript">
function cerrarMenu()
{
        $('.sliding-menu-area').toggleClass('hide-menu');
        $('#menu-toggler').toggleClass('lnr-menu');
}
</script>




<script language="javascript">
function muestra()
{
  $('#sumenu_mobile_escudos').hide();
  $('#sumenu_mobile_noticias').hide();
if ($('#sumenu_mobile').is(':visible')) {
    $('#sumenu_mobile').hide();
} else {
    $('#sumenu_mobile').show();
}
}

function muestra_noticias()
{
    $('#sumenu_mobile_escudos').hide();
    $('#sumenu_mobile').hide();
if ($('#sumenu_mobile_noticias').is(':visible')) {
    $('#sumenu_mobile_noticias').hide();
} else {
    $('#sumenu_mobile_noticias').show();
}
}

function muestra_escudos()
{
     $('#sumenu_mobile').hide();
	  $('#sumenu_mobile_noticias').hide();
  
if ($('#sumenu_mobile_escudos').is(':visible')) {
    $('#sumenu_mobile_escudos').hide();
} else {
    $('#sumenu_mobile_escudos').show();
}
}
</script>




<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "Organization",
  "name": "guiafantasy.com", 
  "url": "https://www.guiafantasy.com",
  "logo": "https://www.guiafantasy.com/images/logo.png",
  "sameAs": [
		"https://www.facebook.com/guiafantasy/",
		"https://twitter.com/guiafantasy",
		"https://t.me/guiafantasy"
   ]
}
</script>




</head>
<body>


<script language="JavaScript" src="/js/ajax.js" type="text/javascript"></script>
<script language="javascript">



function ver_jugadores(limite=0){


	var contenedor = document.getElementById('contenedor_jugadores'); 						

	var id_equipo = document.getElementById('id_equipo').value; 						
	var posicion = document.getElementById('posicion').value; 						
	var precio = document.getElementById('precio').value; 						
	var ordenar = document.getElementById('ordenar').value; 	
	var nombre = document.getElementById('nombre').value; 					
		
	ajax_docs=nuevoAjax(); 

	ajax_docs.open("POST", "https://www.guiafantasy.com/ajax/contenido_jugadores.php",true);

	ajax_docs.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");


	ajax_docs.send("operacion=1&id_equipo="+id_equipo+"&posicion="+posicion+"&precio="+precio+"&nombre="+nombre+"&limite="+limite+"&ordenar="+ordenar);



	contenedor.innerHTML="<div class='col-md-12;' style='padding:10px;text-align:center' align='center' ><img src='https://www.guiafantasy.com/images/loading2.gif' style='width:30px;'> <br><span style='font-size:12px; color:#f8b26a'> Obteniendo Jugadores...</div>";

	ajax_docs.onreadystatechange=function() { 

	
	if (ajax_docs.readyState==4) {
		contenedor.innerHTML = ajax_docs.responseText;

		}
	}
	
}


</script>






<header class="header" style="margin-bottom:5px; z-index:999999999">
  <nav class="navbar navbar-default">
    <div class="container-fluid" style="background-image: url(/images/bg-pattern.png);">
      <div class="navbar-search"><i class="fa fa-search" aria-hidden="true"></i></div>
      <div class="logosmall"><a href="https://www.guiafantasy.com/"><img src="/images/logo.png" alt="Guía Fantasy" /></a></div>
      <!-- end navbar-hamburger -->
      <ul class="nav navbar-nav hidden-xs">
      <li><a  href="https://www.guiafantasy.com/"><img src="https://www.guiafantasy.com/images/logo.png" alt="Guía Fantasy" style="padding-bottom:2px;" title="Guía Fantasy" height="30"></a></li>
      <li><a href="https://www.guiafantasy.com/dudas/fantasy">Dudas</a></li>

      <li><a href="https://www.comuniate.com/alineaciones/comunio" target="_blank">Onces</a></li>

      <li><a href="https://www.guiafantasy.com/noticias/fantasy">Actualidad</a></li>


       <li class="dropdown">
         <a class="dropdown-toggle" data-toggle="dropdown" href="#">Jugadores <i class="fa fa-caret-down" aria-hidden="true"></i></a>
             <ul class="dropdown-menu" role="menu">
                <li><a href="https://www.guiafantasy.com/jugadores" title="Jugadores fantasy">Jugadores</a></li>
                <li><a href="https://www.comuniate.com/lesionados/comunio" title="Lesionados fantasy"  target="_blank">Lesionados</a></li>
                <li><a href="https://www.comuniate.com/sancionados/comunio" title="Sancionados fantasy" target="_blank">Sancionados</a></li>          
                <li><a href="https://www.guiafantasy.com/subidas_bajadas.php" title="Subidas y Bajadas fantasy">Subidas y Bajadas Mercado</a></li>
            </ul>
         </li>

                <!--<li></li>-->
      </ul>
      <div class="navbar-jugadores pull-right"> 
	      <div class="dropdown visible-xs" style="margin-top:10px;z-index:1000;">
            <div class="fa fa-reorder fa-header-menu utiles-rotar" id="boton-menu"  onclick="openNav()"></div>
	   	   </div><!-- div dropdown-->
       	</div><!-- div navbar-->
    </div><!-- end container-fluid --> 
</nav>



<!-- end side-menu -->
<div class="search-box" id="search-box">
  <div class="container">
    <div class="row">
      <div class="col-xs-11">
        <form>
          <input type="text" id="topic_title" placeholder="Buscar jugador" style="width:100%">
        </form>
      </div>
      <div class="col-xs-1"><a href="#" class="close-search"><span style="font-size:32px; color:#ed4138; float:right"><i class="fa fa-close" aria-hidden="true"></i></span></a></div>
      <!-- end col-12 --> 
    </div>
    <!-- end container --> 
  </div>
  <!-- end container --> 
  </div>
<!-- end search-box -->


<div class="row">
  <div class="col-xs-12 col-md-12 nav_escudos">
               <section class="carousel-posts-escudos">
                  <div class="owl-carousel" id="owl-carousel2">

     <div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/d-alaves'><img src='https://www.guiafantasy.com/fotos_equipos/21.png' style='padding:3px;' alt='Plantilla fantasy del Deportivo Alavés' title='Plantilla fantasy del Deportivo Alavés'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/athletic-club'><img src='https://www.guiafantasy.com/fotos_equipos/3.png' style='padding:3px;' alt='Plantilla fantasy del Athletic Club' title='Plantilla fantasy del Athletic Club'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/atletico-de-madrid'><img src='https://www.guiafantasy.com/fotos_equipos/2.png' style='padding:3px;' alt='Plantilla fantasy del Atlético de Madrid' title='Plantilla fantasy del Atlético de Madrid'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/fc-barcelona'><img src='https://www.guiafantasy.com/fotos_equipos/4.png' style='padding:3px;' alt='Plantilla fantasy del FC Barcelona' title='Plantilla fantasy del FC Barcelona'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/real-betis'><img src='https://www.guiafantasy.com/fotos_equipos/5.png' style='padding:3px;' alt='Plantilla fantasy del Real Betis' title='Plantilla fantasy del Real Betis'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/rc-celta'><img src='https://www.guiafantasy.com/fotos_equipos/6.png' style='padding:3px;' alt='Plantilla fantasy del RC Celta' title='Plantilla fantasy del RC Celta'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/elche-c-f'><img src='https://www.guiafantasy.com/fotos_equipos/7.png' style='padding:3px;' alt='Plantilla fantasy del Elche CF' title='Plantilla fantasy del Elche CF'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/rcd-espanyol'><img src='https://www.guiafantasy.com/fotos_equipos/8.png' style='padding:3px;' alt='Plantilla fantasy del RCD Espanyol de Barcelona' title='Plantilla fantasy del RCD Espanyol de Barcelona'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/getafe-cf'><img src='https://www.guiafantasy.com/fotos_equipos/9.png' style='padding:3px;' alt='Plantilla fantasy del Getafe CF' title='Plantilla fantasy del Getafe CF'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/girona-fc'><img src='https://www.guiafantasy.com/fotos_equipos/28.png' style='padding:3px;' alt='Plantilla fantasy del Girona FC' title='Plantilla fantasy del Girona FC'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/levante-ud'><img src='https://www.guiafantasy.com/fotos_equipos/11.png' style='padding:3px;' alt='Plantilla fantasy del Levante UD' title='Plantilla fantasy del Levante UD'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/rcd-mallorca'><img src='https://www.guiafantasy.com/fotos_equipos/33.png' style='padding:3px;' alt='Plantilla fantasy del RCD Mallorca' title='Plantilla fantasy del RCD Mallorca'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/c-a-osasuna'><img src='https://www.guiafantasy.com/fotos_equipos/13.png' style='padding:3px;' alt='Plantilla fantasy del C.A. Osasuna' title='Plantilla fantasy del C.A. Osasuna'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/real-oviedo'><img src='https://www.guiafantasy.com/fotos_equipos/157.png' style='padding:3px;' alt='Plantilla fantasy del Real Oviedo' title='Plantilla fantasy del Real Oviedo'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/rayo-vallecano'><img src='https://www.guiafantasy.com/fotos_equipos/14.png' style='padding:3px;' alt='Plantilla fantasy del Rayo Vallecano' title='Plantilla fantasy del Rayo Vallecano'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/real-madrid'><img src='https://www.guiafantasy.com/fotos_equipos/15.png' style='padding:3px;' alt='Plantilla fantasy del Real Madrid' title='Plantilla fantasy del Real Madrid'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/real-sociedad'><img src='https://www.guiafantasy.com/fotos_equipos/16.png' style='padding:3px;' alt='Plantilla fantasy del Real Sociedad' title='Plantilla fantasy del Real Sociedad'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/sevilla-fc'><img src='https://www.guiafantasy.com/fotos_equipos/17.png' style='padding:3px;' alt='Plantilla fantasy del Sevilla FC' title='Plantilla fantasy del Sevilla FC'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/valencia-cf'><img src='https://www.guiafantasy.com/fotos_equipos/18.png' style='padding:3px;' alt='Plantilla fantasy del Valencia CF' title='Plantilla fantasy del Valencia CF'/></a></div><div class="item enlace-escudos"><a href='https://www.guiafantasy.com/equipos/villarreal-cf'><img src='https://www.guiafantasy.com/fotos_equipos/20.png' style='padding:3px;' alt='Plantilla fantasy del Villarreal CF' title='Plantilla fantasy del Villarreal CF'/></a></div>
    </div>
  	<!-- escudos_resposive-->

</section>
</div></div>


 <!-- menu horizontal principal-->
    <div class="menu_horizontal_movil">

    <a href="https://www.guiafantasy.com/subidas_bajadas.php"  title="Mecado fantasy"><div class="col-md-2 col-xs-2 boton_movil ">
     <img src="https://www.guiafantasy.com/images/cabecera/mercado.svg" height="25" alt="Puntos fantasy"><br /><strong>Mercado</strong>
     </div> </a>

    <a href="https://www.guiafantasy.com/noticias/fantasy" title="Noticias fantasy"> <div class="col-md-2 col-xs-2 boton_movil ">
    <img src="https://www.guiafantasy.com/images/cabecera/noticias.svg" height="25" alt="Noticias fantasy"><br /><strong>Blog</strong>
    </div></a>


  <a href="https://www.guiafantasy.com/jugadores" title="Jugadores fantasy"><div class="col-md-2 col-xs-2 boton_movil boton_movil_activo">
    <img src="https://www.guiafantasy.com/images/cabecera/jugadores.svg" height="25" alt="Jugadores fantasy"><br /><strong>Jugadores</strong>
    </div> </a>

    <a href="https://www.guiafantasy.com/comparar_jugadores.php"  title="Posibles Alineaciones"><div class="col-md-2 col-xs-2 boton_movil ">
    <img src="https://www.guiafantasy.com/images/cabecera/comparar.svg" height="25" alt="Posibles Onces"><br /><strong>Comparar</strong>
    </div>
    </a>

      <a href="https://www.comuniate.com/alineaciones/comunio"  title="Posibles Alineaciones"><div class="col-md-2 col-xs-2 boton_movil ">
    <img src="https://www.guiafantasy.com/images/cabecera/campo.svg" height="25" alt="Posibles Onces"><br /><strong>Onces</strong>
    </div>
    </a>
    <a href="https://www.guiafantasy.com/dudas/fantasy"  title="Dudas fantasy"><div class="col-md-2 col-xs-2 boton_movil ">
    <img src="https://www.guiafantasy.com/images/cabecera/dudas.svg" height="25" alt="Posibles Onces"><br /><strong>Dudas</strong>
    </div>
    </a>
    </div>
     <!-- FIN menu horizontal principal-->
</header>
<!-- end header -->



<div id="mySidenav" class="sidenav">
  <div class="row"> 
    <div class="col-xs-12"><a href="https://www.comuniate.com/lesionados/comunio" title="Lesionados fantasy"><span class="fa fa-user-md menu-icono" ></span> <span>LESIONADOS</span></a></div>
    <div class="col-xs-12"><a href="https://www.comuniate.com/sancionados/comunio" title="Sancionados fantasy"><span class="fa fa-square menu-icono"></span> <span>SANCIONADOS</span></a></div>
    <div class="col-xs-12"><a href="https://www.guiafantasy.com/subidas_bajadas.php" title="Subidas y Bajadas fantasy"><span class="fa fa-subidones menu-icono"></span> <span>SUBIDAS Y BAJADAS</span></a></div>
    <div class="col-xs-12"><a href="https://www.guiafantasy.com/comparar_jugadores.php" title="Comparar jugadores"><span class="fa fa-comparar menu-icono"></span> <span>COMPARAR JUGADORES</span></a></div>
    <div class="col-xs-12"><a href="https://www.guiafantasy.com/noticias_sitemap.php" title="Sitemap"><span class="fa fa-comparar menu-icono"></span> <span>SITEMAP NOTICIAS</span></a></div>
    <div class="col-xs-12"><a href="https://www.guiafantasy.com/noticias/62/te-gustaria-colaborar-con-nosotros" title="Colabora" style="color:orange"><span class="fa fa-comments menu-icono"></span> <span>¿QUIERES COLABORAR?</span></a></div>
  </div>
  
</div>
</div>

<div id="HB_Footer_Close_hbagency_space_89538">
 <div id="HB_CLOSE_hbagency_space_89538"></div>
 <div id="HB_OUTER_hbagency_space_89538">
 <div id='hbagency_space_89538' ></div>
 </div></div>
<section class="main-content">
<div id="content-banner-left"></div>
<div id="content-banner-right"></div>

  <div class="container">
  
      
    <div class="row">
      <div class="col-xs-12">
        <div id="content-left">
            
                          
 <div class="row">
           <div class="col-md-12" style="margin:0px; padding:0px;">

 
   <h1 class="linea_titulo"><strong>Jugadores</strong> <span style="font-size:14px"><strong> Liga Fantasy</strong></span></h1>
            
            
            <div style="margin-bottom:15px;">
            <a class="btn btn-success" data-toggle="collapse" href="#Collapse1" role="button" aria-expanded="false" aria-controls="Collapse1"><i class="fa fa-filter" aria-hidden="true"></i> Filtrar Jugadores <i class="fa fa-caret-down" aria-hidden="true"></i></a>
            </div>
            
            <div class="row">
            <div class="col-md-12">
            <div class="collapse multi-collapse" id="Collapse1" >

            <form class="form-horizontal" name="formulario_busqueda" id="formulario_busqueda">

            <div class="col-md-15 col-xs-4">
              <!-- /.form-group -->
              <div class="form-group">
                <label><small>Equipo</small></label>
               
                              
                <select name="id_equipo" id="id_equipo"  class="form-control select" style="width: 100%;border-color: #5cb85c;"  onChange="ver_jugadores();">
       				<option value="0" >-TODOS-</option>
				<option value='21'>Deportivo Alavés</option><option value='3'>Athletic Club</option><option value='2'>Atlético de Madrid</option><option value='4'>FC Barcelona</option><option value='5'>Real Betis</option><option value='6'>RC Celta</option><option value='7'>Elche CF</option><option value='8'>RCD Espanyol de Barcelona</option><option value='9'>Getafe CF</option><option value='28'>Girona FC</option><option value='11'>Levante UD</option><option value='33'>RCD Mallorca</option><option value='13'>C.A. Osasuna</option><option value='157'>Real Oviedo</option><option value='14'>Rayo Vallecano</option><option value='15'>Real Madrid</option><option value='16'>Real Sociedad</option><option value='17'>Sevilla FC</option><option value='18'>Valencia CF</option><option value='20'>Villarreal CF</option>				</select>	
              </div>
              <!-- /.form-group -->
            </div>
            <!-- /.col -->
 			
            
             <div class="col-md-15 col-xs-4">
              <!-- /.form-group -->
              <div class="form-group">
                <label><small>Posición</small></label>
                
                <select name="posicion" id="posicion"  class="form-control select" style="width: 100%;border-color: #5cb85c;"  onChange="ver_jugadores();">
				<option value="0" >-TODOS-</option>
				<option value="1" >PORTERO</option>
                <option value="2" >DEFENSA</option>
                <option value="3" >MEDIO</option>
                <option value="4" >DELANTERO</option>
                <option value="5" >ENTRENADOR</option>

				</select>	
              </div>
              <!-- /.form-group -->
            </div>
            
            
            
            <div class="col-md-15 col-xs-4">
              <!--/.form-group -->
              <div class="form-group">
                <label><small>Precio</small></label>
                <select name="precio" id="precio"  class="form-control select" style="width: 100%;border-color: #5cb85c;" onChange="ver_jugadores();">
				<option value="0" >-TODOS-</option>
                <option value="0" >MENOS DE 5 MILLON</option>
                <option value="5" >ENTRE 5 Y 20 MILLONES</option>
                <option value="20" >ENTRE 20 Y 30 MILLONES</option>
                 <option value="30" >MAS DE 30 MILLONES</option>
				</select>	
              </div>
              <!-- /.form-group -->
            </div>
            
             <div class="col-md-15 col-xs-6">
              <div class="form-group">
                <label><small>Nombre</small></label>
                <input type="text" name="nombre" id="nombre" onKeyUp="ver_jugadores();" class="form-control" style="height:34px;border-color: #5cb85c;"/>	
              </div>
            </div>
            
            
              <div class="col-md-15 col-xs-6">
              <div class="form-group">
                <label><small>Ordenar por</small></label>
                <select name="ordenar" id="ordenar"  class="form-control select" style="width: 100%;border-color: #5cb85c;" onChange="ver_jugadores();">
				<option value="0" >Más Puntos</option>
                <option value="1" >Mayor Precio</option>
                <option value="2">Menos Puntos</option>
                <option value="3">Menor Precio</option>
                <option value="4">Posición</option>
                <option value="5">Mejor Racha</option>    
                <option value="6">Mejor Media</option>                
                            
				</select>	
              </div>
            </div>
            

            </form>
            </div>
          </div></div></div>
 

</div>

            
             

          
            
 	<div class="row" style="margin:0px; padding:0px;">
	 <div class="col-md-12" style="margin:0px; padding:0px;">
 




		 <div id="contenedor_jugadores">
		 </div><!-- contenido-jugadores-->
              
              
	</div>
       </div>
          <!-- /.row -->
        
        </div>
  <!-- end content-left -->
  

  
  
        <div id="content-right">
        
                  
           
             
            
            
        </div>
        <!-- end content-right --> 
        

        
      </div>
      <!-- end col-12 --> 
    </div>
    <!-- end row --> 
  </div>
  <!-- end container --> 
</section>
<!-- end main-content -->


<div class="hb-ad-static hb-ad-box" align="center" style="margin-top:30px">
    <div class="hb-ad-inner">
    <div class="hbagency_cls_static" id="hbagency_space_89598" ></div></div></div>


<footer class="footer" style="margin-top:10px">
  <div class="sub-footer">
    <div class="container">
      <div class="row">
        <div class="col-xs-12 text-center">
          <div><img src="/images/logo.png" alt="logo Guía Fantasy" style="max-width:200px"/></div>
          
                    <a href="mailto:guiafantasyweb@gmail.com">guiafantasyweb@gmail.com</a>
          <br /><span>Copyright © 2025 Todos los derechos reservados.<br><a href="https://www.guiafantasy.com/aviso_legal.php">Aviso Legal</a>
      </div><!--xs12-->

      <!-- end row -->
    </div>
    <!-- end container -->
</div><!-- container-->
</div><!--subfooter-->
</footer>
<!-- end footer -->



<!-- Google Analytics -->

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-JSG7NK7E2R"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-JSG7NK7E2R');
</script>

<!-- End Google Analytics -->



<script src="https://www.guiafantasy.com/js/jquery.min-carrousel.js?modo=speed22"></script>
<script src="https://www.guiafantasy.com/js/owl.carousel.min.js?modo=dinamico"></script> 
<script src="https://www.guiafantasy.com/js/scripts_carousel.js?modo=nostart"></script>


<script>



//funcion que abre el menu derecho mobile
function openNav() {
  $("#mySidenav").toggleClass("sidenav_open");
  $("#boton-menu").toggleClass("rotar-menu");
  $("#boton-menu").toggleClass("fa-reorder");
  $("#boton-menu").toggleClass("fa-close");
}
  
</script>




<!-- JS FILES --> 
<script src="/js/jquery.min.js"></script> 
<script src="/js/bootstrap.min.js"></script> 
<script src="/js/stickysidebar.js"></script> 

<script src="https://www.guiafantasy.com/js/scripts.js?update=1"></script>

  
  <!-- AUTOCOMPLETE -->
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"></script>
<script src="/autocomplete/jquery.ui.autocomplete.js"></script>
<script src="/autocomplete/autocomplete.js"></script> 


<script type="application/javascript">

ver_jugadores();

</script>

</body>

</html>