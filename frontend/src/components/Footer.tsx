export default function Footer() {
  return (
    <footer className="bg-primary-800 text-primary-200 text-[11px] mt-auto">
      <div className="max-w-7xl mx-auto px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Contact */}
        <div>
          <div className="font-semibold text-white text-xs mb-1">Contact</div>
          <div>Bachupally, Nizampet (S.O)</div>
          <div>Hyderabad - 500 090, Telangana</div>
          <div>Phone: 040-2304 2758/59/60</div>
        </div>

        {/* Quick Links */}
        <div>
          <div className="font-semibold text-white text-xs mb-1">Quick Links</div>
          <div>Faculty Appraisal Portal</div>
          <div>FPGP Module</div>
          <div>
            <a href="https://vnrvjiet.ac.in" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:text-accent-200">
              vnrvjiet.ac.in
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="sm:text-right">
          <div className="font-semibold text-white text-xs mb-1">
            &copy; {new Date().getFullYear()} VNRVJIET
          </div>
          <div>All rights reserved</div>
          <div>Faculty Appraisal System v1.0</div>
        </div>
      </div>
    </footer>
  );
}
