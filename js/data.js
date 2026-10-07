window.APP_DATA = {
  subjects: [
    {id:'math',name:'Toán',icon:'➗',color:'pink',desc:'Phép tính, hình học, bài toán có lời văn'},
    {id:'vietnamese',name:'Tiếng Việt',icon:'📖',color:'yellow',desc:'Tập đọc, chính tả, luyện từ và câu'},
    {id:'english',name:'Tiếng Anh',icon:'ABC',color:'blue',desc:'Từ vựng, mẫu câu và ngữ pháp cơ bản'},
    {id:'nature',name:'Tự nhiên & Xã hội',icon:'🌱',color:'green',desc:'Cơ thể, thiên nhiên và cuộc sống'},
    {id:'science',name:'Khoa học',icon:'🔬',color:'purple',desc:'Khám phá khoa học dành cho lớp 4–5'},
    {id:'history',name:'Lịch sử & Địa lý',icon:'🌍',color:'orange',desc:'Con người, vùng miền và lịch sử Việt Nam'}
  ],
  lessons: [
    {id:1,subject:'math',grade:1,title:'Cộng trừ trong phạm vi 100',topic:'Số học',level:'Dễ'},
    {id:2,subject:'vietnamese',grade:2,title:'Luyện đọc: Cậu bé thông minh',topic:'Tập đọc',level:'Dễ'},
    {id:3,subject:'english',grade:3,title:'Present Simple cơ bản',topic:'Ngữ pháp',level:'Trung bình'},
    {id:4,subject:'nature',grade:1,title:'Thực vật quanh em',topic:'Thiên nhiên',level:'Dễ'},
    {id:5,subject:'math',grade:4,title:'Phân số cơ bản',topic:'Phân số',level:'Trung bình'},
    {id:6,subject:'science',grade:5,title:'Năng lượng và đời sống',topic:'Năng lượng',level:'Khó'},
    {id:7,subject:'history',grade:4,title:'Các vùng miền Việt Nam',topic:'Địa lý',level:'Trung bình'},
    {id:8,subject:'vietnamese',grade:5,title:'Luyện từ và câu tổng hợp',topic:'Ngữ pháp',level:'Khó'}
  ],
  questions: [
    {id:101,subject:'math',grade:1,level:'Dễ',q:'25 + 13 bằng bao nhiêu?',options:['36','38','40','42'],answer:1,explain:'25 + 13 = 38.'},
    {id:102,subject:'math',grade:1,level:'Dễ',q:'50 - 17 bằng bao nhiêu?',options:['33','37','43','47'],answer:0,explain:'50 - 17 = 33.'},
    {id:103,subject:'math',grade:1,level:'Trung bình',q:'Số nào lớn nhất?',options:['48','84','64','74'],answer:1,explain:'84 lớn hơn 74, 64 và 48.'},
    {id:104,subject:'vietnamese',grade:2,level:'Dễ',q:'Từ nào chỉ hoạt động?',options:['đẹp','chạy','xanh','cao'],answer:1,explain:'“Chạy” là từ chỉ hoạt động.'},
    {id:105,subject:'english',grade:3,level:'Dễ',q:'Choose the correct sentence.',options:['She go to school.','She goes to school.','She going school.','She gone school.'],answer:1,explain:'Với She ở hiện tại đơn, động từ thêm -s/-es.'},
    {id:106,subject:'nature',grade:1,level:'Dễ',q:'Bộ phận nào của cây hút nước từ đất?',options:['Hoa','Lá','Rễ','Quả'],answer:2,explain:'Rễ giúp cây hút nước và chất khoáng từ đất.'},
    {id:107,subject:'math',grade:4,level:'Trung bình',q:'1/2 + 1/4 bằng?',options:['2/6','2/4','3/4','1/6'],answer:2,explain:'1/2 = 2/4 nên 2/4 + 1/4 = 3/4.'},
    {id:108,subject:'science',grade:5,level:'Khó',q:'Nguồn năng lượng tái tạo là?',options:['Than đá','Dầu mỏ','Mặt trời','Khí đốt'],answer:2,explain:'Năng lượng mặt trời là nguồn tái tạo.'}
  ],
  tests: [
    {id:'t1',title:'Toán lớp 1 - 15 phút',subject:'math',grade:1,time:15,count:3,difficulty:'Dễ'},
    {id:'t2',title:'Tiếng Việt lớp 2 - Giữa kỳ',subject:'vietnamese',grade:2,time:35,count:5,difficulty:'Trung bình'},
    {id:'t3',title:'Tiếng Anh lớp 3 - Ôn tập',subject:'english',grade:3,time:25,count:5,difficulty:'Trung bình'},
    {id:'t4',title:'Toán lớp 4 - Cuối kỳ',subject:'math',grade:4,time:45,count:8,difficulty:'Khó'}
  ],
  materials: [
    {id:'m1',title:'Phiếu ôn tập Toán lớp 1',subject:'Toán',grade:1,size:'1.2 MB'},
    {id:'m2',title:'50 từ vựng tiếng Anh lớp 3',subject:'Tiếng Anh',grade:3,size:'0.8 MB'},
    {id:'m3',title:'Đề cương Tiếng Việt học kỳ II',subject:'Tiếng Việt',grade:5,size:'1.6 MB'},
    {id:'m4',title:'Sơ đồ kiến thức Khoa học lớp 5',subject:'Khoa học',grade:5,size:'2.1 MB'}
  ],
  demoUsers: [
    {id:'u1',name:'Bé Minh Anh',email:'hocsinh@demo.vn',role:'student',grade:3,avatar:'👧🏻'},
    {id:'u2',name:'Quản trị viên',email:'admin@demo.vn',role:'admin',grade:null,avatar:'🧑🏻‍💻'},
    {id:'u3',name:'Phụ huynh Minh Anh',email:'phuhuynh@demo.vn',role:'parent',grade:null,avatar:'👩🏻'}
  ]
};
