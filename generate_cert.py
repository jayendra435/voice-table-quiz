"""Generate a self-signed SSL certificate for HTTPS server."""
import os
import subprocess

cert_file = 'server.crt'
key_file = 'server.key'

if os.path.exists(cert_file) and os.path.exists(key_file):
    print(f"Certificate already exists ({cert_file}, {key_file})")
else:
    print("Generating self-signed SSL certificate...")
    # Generate using openssl (usually available on Windows via Git Bash or directly if installed)
    try:
        cmd = [
            'openssl', 'req', '-x509', '-newkey', 'rsa:2048',
            '-keyout', key_file, '-out', cert_file,
            '-days', '365', '-nodes',
            '-subj', '/CN=localhost'
        ]
        subprocess.run(cmd, check=True)
        print(f"✓ Certificate created: {cert_file}")
        print(f"✓ Key created: {key_file}")
        print("Run: python server.py")
    except FileNotFoundError:
        print("openssl not found. Installing via cryptography library...")
        try:
            from cryptography import x509
            from cryptography.x509.oid import NameOID
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.backends import default_backend
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import serialization
            import datetime
            
            # Generate private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
            
            # Generate certificate
            subject = issuer = x509.Name([
                x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
            ])
            cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                issuer
            ).public_key(
                private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.datetime.utcnow()
            ).not_valid_after(
                datetime.datetime.utcnow() + datetime.timedelta(days=365)
            ).add_extension(
                x509.SubjectAlternativeName([x509.DNSName("localhost"), x509.DNSName("*")]),
                critical=False,
            ).sign(private_key, hashes.SHA256(), default_backend())
            
            # Write certificate
            with open(cert_file, 'wb') as f:
                f.write(cert.public_bytes(serialization.Encoding.PEM))
            
            # Write private key
            with open(key_file, 'wb') as f:
                f.write(private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.TraditionalOpenSSL,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            
            print(f"✓ Certificate created: {cert_file}")
            print(f"✓ Key created: {key_file}")
            print("Run: python server.py")
        except ImportError:
            print("cryptography library not found. Install with: pip install cryptography")
