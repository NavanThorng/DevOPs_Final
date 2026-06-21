FROM php:8.2-apache

# Install extension drivers required for Pure PHP database connection 
RUN docker-php-ext-install pdo pdo_mysql

# Copy project directories into the standard Apache server directory
COPY . /var/www/html/

EXPOSE 80