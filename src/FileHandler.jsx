// src/utils/fileHandler.js
export const handleFileRead = (file, callback, errorCallback) => {
    if (!file) {
      errorCallback("파일이 선택되지 않았습니다.");
      return;
    }
  
    const reader = new FileReader();
  
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsedList = JSON.parse(content);
  
        if (Array.isArray(parsedList)) {
          callback(parsedList); // 파일 데이터 전달
        } else {
          throw new Error("파일 내용이 배열 형식이어야 합니다.");
        }
      } catch (err) {
        errorCallback("유효하지 않은 파일 형식입니다. JSON 배열을 업로드해주세요.");
      }
    };
  
    reader.readAsText(file);
  };

  