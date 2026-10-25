FROM nginx:alpine

# Copy custom static HTML and standalone install scripts
COPY index.html /usr/share/nginx/html/index.html
COPY install.sh /usr/share/nginx/html/install.sh
COPY install.ps1 /usr/share/nginx/html/install.ps1

# Expose standard port 8080 expected by Cloud Run
RUN sed -i 's/listen       80;/listen       8080;/g' /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
